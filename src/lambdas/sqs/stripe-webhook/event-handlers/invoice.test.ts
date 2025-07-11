/* eslint-disable camelcase */
import type { Logger } from '@aws-lambda-powertools/logger';
import type { CreditAdditionResult } from '@model/Credits';
import type { TierMap, TopupMap } from '@model/PaymentPlans';
import type {
  Email,
  IdpId,
  IdpName,
  TierId,
  TopupId,
  UserId,
  UserIdentity
} from '@notifycal/shared/types';
import type { SubscriptionService } from '@services/subscription';
import type { TopupService } from '@services/topup';
import { validPaymentPlans } from '@testing/data/pricing';
import type Stripe from 'stripe';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { InvoicePaymentSucceededHandler } from './invoice';

describe(InvoicePaymentSucceededHandler, () => {
  const validIdentity: UserIdentity<IdpName> = {
    userId: 'user-123' as UserId,
    email: 'user@example.com' as Email,
    idp: 'google.com',
    idpId: '42524352354' as IdpId
  };

  const validTiers: TierMap = validPaymentPlans.tiers;
  const validTopups: TopupMap = validPaymentPlans.topups;

  const validInvoiceLineItemRefund: Stripe.InvoiceLineItem = {
    id: 'il_test123',
    pricing: {
      price_details: {
        price: validTiers.good.priceId
      }
    },
    plan: {
      amount: 1000
    },
    amount: -750 // in negative cause it is a refund
  } as unknown as Stripe.InvoiceLineItem;

  const validBetterLineItemRefund: Stripe.InvoiceLineItem = {
    id: 'il_test456',
    pricing: {
      price_details: {
        price: validTiers.better.priceId
      }
    },
    plan: {
      amount: 3500
    },
    amount: -2800 // in negative cause it is a refund
  } as unknown as Stripe.InvoiceLineItem;

  const validBestLineItem: Stripe.InvoiceLineItem = {
    id: 'il_test789',
    pricing: {
      price_details: {
        price: validTiers.best.priceId
      }
    },
    plan: {
      amount: 6000
    }
  } as unknown as Stripe.InvoiceLineItem;

  const validTopupLineItem: Stripe.InvoiceLineItem = {
    id: 'il_topup123',
    quantity: 100,
    pricing: {
      price_details: {
        price: validTopups.single.priceId
      }
    }
  } as unknown as Stripe.InvoiceLineItem;

  const validSubscriptionCreateInvoice: Stripe.Invoice = {
    id: 'in_test123',
    customer: 'cus_test456',
    amount_paid: 2000,
    amount_due: 2000,
    billing_reason: 'subscription_create',
    created: 1703980800,
    lines: {
      data: [validInvoiceLineItemRefund]
    }
  } as Stripe.Invoice;

  const validSubscriptionCycleInvoice: Stripe.Invoice = {
    ...validSubscriptionCreateInvoice,
    billing_reason: 'subscription_cycle'
  } as Stripe.Invoice;

  const validUpgradeInvoice: Stripe.Invoice = {
    id: 'in_upgrade123',
    customer: 'cus_test456',
    amount_paid: 1000,
    amount_due: 1000,
    billing_reason: 'subscription_update',
    created: 1703980800,
    lines: {
      data: [validBetterLineItemRefund, validInvoiceLineItemRefund]
    }
  } as Stripe.Invoice;

  const validDowngradeInvoice: Stripe.Invoice = {
    ...validUpgradeInvoice,
    amount_paid: 0,
    lines: {
      data: [validInvoiceLineItemRefund, validBetterLineItemRefund]
    }
  } as Stripe.Invoice;

  const validManualInvoice: Stripe.Invoice = {
    id: 'in_manual123',
    customer: 'cus_test456',
    amount_paid: 1000,
    billing_reason: 'manual',
    created: 1703980800,
    lines: {
      data: [validTopupLineItem]
    }
  } as Stripe.Invoice;

  const validInvoiceWithUnknownPriceId: Stripe.Invoice = {
    ...validSubscriptionCreateInvoice,
    lines: {
      data: [
        {
          ...validInvoiceLineItemRefund,
          pricing: {
            price_details: {
              price: 'unknown_price_id'
            }
          }
        }
      ]
    }
  } as Stripe.Invoice;

  const validInvoiceWithoutLineItems: Stripe.Invoice = {
    ...validSubscriptionCreateInvoice,
    lines: {
      data: []
    }
  } as unknown as Stripe.Invoice;

  const validInvoiceWithNullPricing: Stripe.Invoice = {
    ...validSubscriptionCreateInvoice,
    lines: {
      data: [
        {
          ...validInvoiceLineItemRefund,
          pricing: null
        }
      ]
    }
  } as Stripe.Invoice;

  const validSuccessResult: CreditAdditionResult = {
    success: true,
    result: 'Success',
    operationDetails: {
      fromBalance: 'subscription',
      quantity: 100
    },
    balances: {
      subscription: 40,
      topup: 10
    }
  };

  const validErrorResult: CreditAdditionResult = {
    success: false,
    result: 'UnknownError',
    error: new Error('Subscription service failed unexpectedly')
  };

  it('should create a subscription successfully when billing reason is subscription_create', async () => {
    const createFn = vi.fn().mockResolvedValue(validSuccessResult);
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    await testIt(
      validEvent(validSubscriptionCreateInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    expect(createFn).toHaveBeenCalledTimes(1);
    expect(createFn).toHaveBeenCalledWith(validIdentity, validTiers.good.id);
    expect(renewFn).not.toHaveBeenCalled();
    expect(upgradeFn).not.toHaveBeenCalled();
    expect(downgradeFn).not.toHaveBeenCalled();
    // eslint-disable-next-line vitest/max-expects
    expect(addTopupFn).not.toHaveBeenCalled();
  });

  it('should renew a subscription when billing reason is subscription_cycle', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn().mockResolvedValue(validSuccessResult);
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    await testIt(
      validEvent(validSubscriptionCycleInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    expect(renewFn).toHaveBeenCalledTimes(1);
    expect(renewFn).toHaveBeenCalledWith(validIdentity, validTiers.good.id);
    expect(createFn).not.toHaveBeenCalled();
    expect(upgradeFn).not.toHaveBeenCalled();
    expect(downgradeFn).not.toHaveBeenCalled();
    // eslint-disable-next-line vitest/max-expects
    expect(addTopupFn).not.toHaveBeenCalled();
  });

  it('should process a topup when billing reason is manual', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn().mockResolvedValue(validSuccessResult);

    await testIt(
      validEvent(validManualInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    expect(addTopupFn).toHaveBeenCalledTimes(1);
    expect(addTopupFn).toHaveBeenCalledWith(validIdentity, validTopups.single.id, 100);
    expect(createFn).not.toHaveBeenCalled();
    expect(renewFn).not.toHaveBeenCalled();
    expect(upgradeFn).not.toHaveBeenCalled();
    // eslint-disable-next-line vitest/max-expects
    expect(downgradeFn).not.toHaveBeenCalled();
  });

  it('should throw error when topup quantity is 0', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const zeroQuantityInvoice: Stripe.Invoice = {
      ...validManualInvoice,
      lines: {
        data: [
          {
            ...validTopupLineItem,
            quantity: 0
          }
        ]
      }
    } as Stripe.Invoice;

    const result = testIt(
      validEvent(zeroQuantityInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Error while handling topup in invoice.payment_succeeded event handler. Error: Quantity is not greater than 0. Quantity: 0'
    );

    expect(addTopupFn).not.toHaveBeenCalled();
  });

  it('should throw error when topup quantity is null', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const nullQuantityInvoice: Stripe.Invoice = {
      ...validManualInvoice,
      lines: {
        data: [
          {
            ...validTopupLineItem,
            quantity: null
          }
        ]
      }
    } as Stripe.Invoice;

    const result = testIt(
      validEvent(nullQuantityInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Error while handling topup in invoice.payment_succeeded event handler. Error: Quantity is not greater than 0. Quantity: null'
    );

    expect(addTopupFn).not.toHaveBeenCalled();
  });

  it('should throw error when topup product has unknown price ID', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const unknownTopupInvoice: Stripe.Invoice = {
      ...validManualInvoice,
      lines: {
        data: [
          {
            ...validTopupLineItem,
            pricing: {
              price_details: {
                price: 'unknown_topup_price'
              }
            }
          }
        ]
      }
    } as Stripe.Invoice;

    const result = testIt(
      validEvent(unknownTopupInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Error while handling topup in invoice.payment_succeeded event handler. Error: Unknown price ID: unknown_topup_price. No matching tier/topup found. Invoice item ID: il_topup123'
    );

    expect(addTopupFn).not.toHaveBeenCalled();
  });

  it('should reject when topup service returns UnknownError', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const error = new Error('Topup service failed unexpectedly');
    const validAdditionErrorResult: CreditAdditionResult = {
      success: false,
      result: 'UnknownError',
      error: error
    };
    const addTopupFn = vi.fn().mockResolvedValue(validAdditionErrorResult);

    const result = testIt(
      validEvent(validManualInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    await expect(result).rejects.toThrow(error.message);
  });

  it('should extract correct tier from better tier price', async () => {
    const createFn = vi.fn().mockResolvedValue(validSuccessResult);
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const betterTierInvoice: Stripe.Invoice = {
      ...validSubscriptionCreateInvoice,
      lines: {
        data: [validBetterLineItemRefund],
        object: 'list',
        has_more: false,
        url: ''
      }
    };

    await testIt(
      validEvent(betterTierInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    expect(createFn).toHaveBeenCalledWith(validIdentity, validTiers.better.id);
  });

  it('should extract correct tier from best tier price', async () => {
    const createFn = vi.fn().mockResolvedValue(validSuccessResult);
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const bestTierInvoice: Stripe.Invoice = {
      ...validSubscriptionCreateInvoice,
      lines: {
        data: [validBestLineItem],
        object: 'list',
        has_more: false,
        url: ''
      }
    };

    await testIt(
      validEvent(bestTierInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    expect(createFn).toHaveBeenCalledWith(validIdentity, validTiers.best.id);
  });

  it('should upgrade a subscription when billing reason is subscription_update and amount_paid is greater than 0', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn().mockResolvedValue(undefined);
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    await testIt(
      validEvent(validUpgradeInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    expect(upgradeFn).toHaveBeenCalledTimes(1);
    expect(upgradeFn).toHaveBeenCalledWith(
      validIdentity,
      validTiers.better.id,
      validTiers.good.id,
      expect.any(Number)
    );
    expect(downgradeFn).not.toHaveBeenCalled();
    expect(createFn).not.toHaveBeenCalled();
    expect(renewFn).not.toHaveBeenCalled();
    // eslint-disable-next-line vitest/max-expects
    expect(addTopupFn).not.toHaveBeenCalled();
  });

  it('should downgrade a subscription when billing reason is subscription_update and amount_paid is 0', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn().mockResolvedValue(undefined);
    const addTopupFn = vi.fn();

    await testIt(
      validEvent(validDowngradeInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    expect(downgradeFn).toHaveBeenCalledTimes(1);
    expect(downgradeFn).toHaveBeenCalledWith(validIdentity);
    expect(upgradeFn).not.toHaveBeenCalled();
    expect(createFn).not.toHaveBeenCalled();
    expect(renewFn).not.toHaveBeenCalled();
    // eslint-disable-next-line vitest/max-expects
    expect(addTopupFn).not.toHaveBeenCalled();
  });

  it('should upgrade subscription from good to best tier', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn().mockResolvedValue(undefined);
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const goodToBestUpgrade: Stripe.Invoice = {
      ...validUpgradeInvoice,
      lines: {
        data: [validBestLineItem, validInvoiceLineItemRefund],
        object: 'list',
        has_more: false,
        url: ''
      }
    };

    await testIt(
      validEvent(goodToBestUpgrade),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    expect(upgradeFn).toHaveBeenCalledWith(
      validIdentity,
      validTiers.best.id,
      validTiers.good.id,
      expect.any(Number)
    );
  });

  // eslint-disable-next-line vitest/expect-expect
  it('should handle unknown billing reason without throwing error', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const unknownBillingReasonInvoice: Stripe.Invoice = {
      ...validSubscriptionCreateInvoice,
      billing_reason: 'subscription_threshold' as Stripe.Invoice.BillingReason
    };

    await testIt(
      validEvent(unknownBillingReasonInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    expectNoServiceCallsMade(createFn, renewFn, upgradeFn, downgradeFn, addTopupFn);
  });

  it('should throw error when price ID is not found in tiers', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const result = testIt(
      validEvent(validInvoiceWithUnknownPriceId),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Error while handling create-subscription in invoice.payment_succeeded event handler. Error: Unknown price ID: unknown_price_id. No matching tier/topup found. Invoice item ID: il_test123'
    );

    expectNoServiceCallsMade(createFn, renewFn, upgradeFn, downgradeFn, addTopupFn);
  });

  it('should throw error when invoice has no line items', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const result = testIt(
      validEvent(validInvoiceWithoutLineItems),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Error while handling create-subscription in invoice.payment_succeeded event handler. Error: No price ID found in invoice line item. Invoice item ID: unknown'
    );

    expectNoServiceCallsMade(createFn, renewFn, upgradeFn, downgradeFn, addTopupFn);
  });

  it('should throw error when line item has null pricing', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const result = testIt(
      validEvent(validInvoiceWithNullPricing),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Error while handling create-subscription in invoice.payment_succeeded event handler. Error: No price ID found in invoice line item. Invoice item ID: il_test123'
    );

    expectNoServiceCallsMade(createFn, renewFn, upgradeFn, downgradeFn, addTopupFn);
  });

  it('should throw error when it is not possible to infer the susbscription update type', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const result = testIt(
      validEvent({
        ...validUpgradeInvoice,
        amount_paid: -100
      }),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Failed to infer what kind of subscription update has been performed. Most likely, the amount_paid is unexpected'
    );

    expectNoServiceCallsMade(createFn, renewFn, upgradeFn, downgradeFn, addTopupFn);
  });

  it('should reject when subscription create returns UnknownError', async () => {
    const createFn = vi.fn().mockResolvedValue(validErrorResult);
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const result = testIt(
      validEvent(validSubscriptionCreateInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    await expect(result).rejects.toBe(validErrorResult.error);
  });

  it('should reject when subscription renew returns UnknownError', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn().mockResolvedValue(validErrorResult);
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const result = testIt(
      validEvent(validSubscriptionCycleInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    await expect(result).rejects.toBe(validErrorResult.error);
  });

  it('should throw error when upgrade fails to extract tiers', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const invalidUpgradeInvoice: Stripe.Invoice = {
      ...validUpgradeInvoice,
      lines: {
        data: [
          {
            ...validInvoiceLineItemRefund,
            pricing: {
              price_details: {
                price: 'unknown_price_1',
                product: ''
              }
            }
          },
          {
            ...validBetterLineItemRefund,
            pricing: {
              price_details: {
                price: 'unknown_price_2',
                product: ''
              }
            }
          }
        ]
      }
    } as Stripe.Invoice;

    const result = testIt(
      validEvent(invalidUpgradeInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Error while doing upgrade-subscription: tiers could not be extracted out of the invoice'
    );

    expectNoServiceCallsMade(createFn, renewFn, upgradeFn, downgradeFn, addTopupFn);
  });

  it('should handle upgrade when first tier extraction fails but second succeeds', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();
    const addTopupFn = vi.fn();

    const partiallyValidUpgradeInvoice: Stripe.Invoice = {
      ...validUpgradeInvoice,
      lines: {
        data: [
          {
            ...validInvoiceLineItemRefund,
            pricing: {
              price_details: {
                price: 'unknown_price_id'
              }
            }
          },
          validBetterLineItemRefund
        ]
      }
    } as Stripe.Invoice;

    const result = testIt(
      validEvent(partiallyValidUpgradeInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      addTopupFn,
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Error while doing upgrade-subscription: tiers could not be extracted out of the invoice'
    );

    expectNoServiceCallsMade(createFn, renewFn, upgradeFn, downgradeFn, addTopupFn);
  });

  function validEvent(invoice: Stripe.Invoice): Stripe.InvoicePaymentSucceededEvent {
    const event: Stripe.InvoicePaymentSucceededEvent = {
      id: 'evt_test',
      object: 'event',
      created: Date.now(),
      data: {
        object: invoice
      },
      type: 'invoice.payment_succeeded'
    } as Stripe.InvoicePaymentSucceededEvent;
    return event;
  }

  function expectNoServiceCallsMade(
    createFn: Mock,
    renewFn: Mock,
    upgradeFn: Mock,
    downgradeFn: Mock,
    addTopupFn: Mock
  ): void {
    expect(createFn).not.toHaveBeenCalled();
    expect(renewFn).not.toHaveBeenCalled();
    expect(upgradeFn).not.toHaveBeenCalled();
    expect(downgradeFn).not.toHaveBeenCalled();
    expect(addTopupFn).not.toHaveBeenCalled();
  }

  function testIt(
    event: Stripe.InvoicePaymentSucceededEvent,
    identity: UserIdentity<IdpName>,
    createFn: (identity: UserIdentity<IdpName>, tierId: TierId) => Promise<CreditAdditionResult>,
    renewFn: (identity: UserIdentity<IdpName>, tierId: TierId) => Promise<CreditAdditionResult>,
    upgradeFn: (
      identity: UserIdentity<IdpName>,
      previousTier: TierId,
      currentTier: TierId,
      remainingPercentage: number
    ) => Promise<CreditAdditionResult>,
    downgradeFn: (identity: UserIdentity<IdpName>) => Promise<void>,
    addTopupFn: (
      identity: UserIdentity<IdpName>,
      topupId: TopupId,
      quantity: number
    ) => Promise<CreditAdditionResult>,
    tiers: TierMap,
    topups: TopupMap = validTopups
  ): Promise<void> {
    const subscriptionServiceMock = {
      create: createFn,
      renew: renewFn,
      upgrade: upgradeFn,
      scheduleDowngrade: downgradeFn
    } as unknown as SubscriptionService<IdpName>;

    const topupServiceMock = {
      add: addTopupFn
    } as unknown as TopupService<IdpName>;

    const loggerMock = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as unknown as Logger;

    const handler = new InvoicePaymentSucceededHandler(
      'invoice.payment_succeeded',
      tiers,
      topups,
      subscriptionServiceMock,
      topupServiceMock,
      loggerMock
    );

    return handler.handle(event, identity);
  }
});
