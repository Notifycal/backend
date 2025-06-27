/* eslint-disable camelcase */
import type { Logger } from '@aws-lambda-powertools/logger';
import type { TierId, Tiers } from '@model/PaymentPlans';
import type {
  Email,
  Identity,
  IdpId,
  IdpName,
  UnixTimestamp,
  UserId
} from '@notifycal/shared/types';
import type { Period } from '@own-types/model';
import type { CreditAdditionResult } from '@services/credits-service';
import type { SubscriptionService } from '@services/subscription-service';
import { validPaymentPlans } from '@testing/data/pricing';
import type Stripe from 'stripe';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { InvoicePaymentSucceededHandler } from './invoice';

describe(InvoicePaymentSucceededHandler, () => {
  const validIdentity: Identity<IdpName> = {
    userId: 'user-123' as UserId,
    email: 'user@example.com' as Email,
    idp: 'google.com',
    idpId: '42524352354' as IdpId
  };

  const validTiers: Tiers = validPaymentPlans.tiers;

  const validInvoiceLineItem: Stripe.InvoiceLineItem = {
    id: 'il_test123',
    pricing: {
      price_details: {
        price: validTiers.good.priceId
      }
    },
    period: {
      start: 1703980800,
      end: 1706659200
    }
  } as Stripe.InvoiceLineItem;

  const validBetterLineItem: Stripe.InvoiceLineItem = {
    id: 'il_test456',
    pricing: {
      price_details: {
        price: validTiers.better.priceId
      }
    },
    period: {
      start: 1703980800,
      end: 1706659200
    }
  } as Stripe.InvoiceLineItem;

  const validBestLineItem: Stripe.InvoiceLineItem = {
    id: 'il_test789',
    pricing: {
      price_details: {
        price: validTiers.best.priceId
      }
    },
    period: {
      start: 1703980800,
      end: 1706659200
    }
  } as Stripe.InvoiceLineItem;

  const validSubscriptionCreateInvoice: Stripe.Invoice = {
    id: 'in_test123',
    customer: 'cus_test456',
    amount_paid: 2000,
    amount_due: 2000,
    billing_reason: 'subscription_create',
    created: 1703980800,
    lines: {
      data: [validInvoiceLineItem]
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
      data: [validBetterLineItem, validInvoiceLineItem]
    }
  } as Stripe.Invoice;

  const validDowngradeInvoice: Stripe.Invoice = {
    ...validUpgradeInvoice,
    amount_paid: 0,
    lines: {
      data: [validInvoiceLineItem, validBetterLineItem]
    }
  } as Stripe.Invoice;

  const validManualInvoice: Stripe.Invoice = {
    ...validSubscriptionCreateInvoice,
    billing_reason: 'manual'
  } as Stripe.Invoice;

  const validInvoiceWithUnknownPriceId: Stripe.Invoice = {
    ...validSubscriptionCreateInvoice,
    lines: {
      data: [
        {
          ...validInvoiceLineItem,
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
          ...validInvoiceLineItem,
          pricing: null
        }
      ]
    }
  } as Stripe.Invoice;

  const validSuccessResult: CreditAdditionResult = {
    success: true,
    operationId: 'Success',
    subscriptionCreditBalance: 40
  };

  const validErrorResult: CreditAdditionResult = {
    success: false,
    operationId: 'UnknownError',
    error: new Error('Subscription service failed unexpectedly')
  };

  it('should create a subscription successfully when billing reason is subscription_create', async () => {
    const createFn = vi.fn().mockResolvedValue(validSuccessResult);
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();

    await testIt(
      validEvent(validSubscriptionCreateInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      validTiers
    );

    expect(createFn).toHaveBeenCalledTimes(1);
    expect(createFn).toHaveBeenCalledWith(validIdentity.userId, validTiers.good.id);
    expect(renewFn).not.toHaveBeenCalled();
    expect(upgradeFn).not.toHaveBeenCalled();
    expect(downgradeFn).not.toHaveBeenCalled();
  });

  it('should renew a subscription when billing reason is subscription_cycle', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn().mockResolvedValue(validSuccessResult);
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();

    await testIt(
      validEvent(validSubscriptionCycleInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      validTiers
    );

    expect(renewFn).toHaveBeenCalledTimes(1);
    expect(renewFn).toHaveBeenCalledWith(validIdentity.userId, validTiers.good.id);
    expect(createFn).not.toHaveBeenCalled();
    expect(upgradeFn).not.toHaveBeenCalled();
    expect(downgradeFn).not.toHaveBeenCalled();
  });

  it('should extract correct tier from better tier price', async () => {
    const createFn = vi.fn().mockResolvedValue(validSuccessResult);
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();

    const betterTierInvoice: Stripe.Invoice = {
      ...validSubscriptionCreateInvoice,
      lines: {
        data: [validBetterLineItem],
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
      validTiers
    );

    expect(createFn).toHaveBeenCalledWith(validIdentity.userId, validTiers.better.id);
  });

  it('should extract correct tier from best tier price', async () => {
    const createFn = vi.fn().mockResolvedValue(validSuccessResult);
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();

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
      validTiers
    );

    expect(createFn).toHaveBeenCalledWith(validIdentity.userId, validTiers.best.id);
  });

  it('should upgrade a subscription when billing reason is subscription_update and amount_paid is greater than 0', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn().mockResolvedValue(undefined);
    const downgradeFn = vi.fn();

    await testIt(
      validEvent(validUpgradeInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      validTiers
    );

    expect(upgradeFn).toHaveBeenCalledTimes(1);
    expect(upgradeFn).toHaveBeenCalledWith(
      validIdentity.userId,
      validTiers.better.id,
      validTiers.good.id,
      validBetterLineItem.period,
      validUpgradeInvoice.created as UnixTimestamp
    );
    expect(downgradeFn).not.toHaveBeenCalled();
    expect(createFn).not.toHaveBeenCalled();
    expect(renewFn).not.toHaveBeenCalled();
  });

  it('should downgrade a subscription when billing reason is subscription_update and amount_paid is 0', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn().mockResolvedValue(undefined);

    await testIt(
      validEvent(validDowngradeInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      validTiers
    );

    expect(downgradeFn).toHaveBeenCalledTimes(1);
    expect(downgradeFn).toHaveBeenCalledWith(validIdentity.userId);
    expect(upgradeFn).not.toHaveBeenCalled();
    expect(createFn).not.toHaveBeenCalled();
    expect(renewFn).not.toHaveBeenCalled();
  });

  it('should upgrade subscription from good to best tier', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn().mockResolvedValue(undefined);
    const downgradeFn = vi.fn();

    const goodToBestUpgrade: Stripe.Invoice = {
      ...validUpgradeInvoice,
      lines: {
        data: [validBestLineItem, validInvoiceLineItem],
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
      validTiers
    );

    expect(upgradeFn).toHaveBeenCalledWith(
      validIdentity.userId,
      validTiers.best.id,
      validTiers.good.id,
      validBestLineItem.period,
      goodToBestUpgrade.created as UnixTimestamp
    );
  });

  // eslint-disable-next-line vitest/expect-expect
  it('should handle unknown billing reason without throwing error - for the sake of visibility', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();

    await testIt(
      validEvent(validManualInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      validTiers
    );

    expectSubscriptionServiceNotToHaveBeenCalled(createFn, renewFn, upgradeFn, downgradeFn);
  });

  it('should throw error when price ID is not found in tiers', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();

    const result = testIt(
      validEvent(validInvoiceWithUnknownPriceId),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Error while handling create in invoice.payment_succeeded event handler. Error: Unknown price ID: unknown_price_id. No matching tier found. Invoice item ID: il_test123'
    );

    expectSubscriptionServiceNotToHaveBeenCalled(createFn, renewFn, upgradeFn, downgradeFn);
  });

  it('should throw error when invoice has no line items', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();

    const result = testIt(
      validEvent(validInvoiceWithoutLineItems),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Error while handling create in invoice.payment_succeeded event handler. Error: No price ID found in invoice line item. Invoice item ID: unknown'
    );

    expectSubscriptionServiceNotToHaveBeenCalled(createFn, renewFn, upgradeFn, downgradeFn);
  });

  it('should throw error when line item has null pricing', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();

    const result = testIt(
      validEvent(validInvoiceWithNullPricing),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Error while handling create in invoice.payment_succeeded event handler. Error: No price ID found in invoice line item. Invoice item ID: il_test123'
    );

    expectSubscriptionServiceNotToHaveBeenCalled(createFn, renewFn, upgradeFn, downgradeFn);
  });

  it('should reject when subscription create returns UnknownError', async () => {
    const createFn = vi.fn().mockResolvedValue(validErrorResult);
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();

    const result = testIt(
      validEvent(validSubscriptionCreateInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      validTiers
    );

    await expect(result).rejects.toBe(validErrorResult.error);
  });

  it('should reject when subscription renew returns UnknownError', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn().mockResolvedValue(validErrorResult);
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();

    const result = testIt(
      validEvent(validSubscriptionCycleInvoice),
      validIdentity,
      createFn,
      renewFn,
      upgradeFn,
      downgradeFn,
      validTiers
    );

    await expect(result).rejects.toBe(validErrorResult.error);
  });

  it('should throw error when upgrade fails to extract tiers', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();

    const invalidUpgradeInvoice: Stripe.Invoice = {
      ...validUpgradeInvoice,
      lines: {
        data: [
          {
            ...validInvoiceLineItem,
            pricing: {
              price_details: {
                price: 'unknown_price_1',
                product: ''
              }
            }
          },
          {
            ...validBetterLineItem,
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
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Error while doing upgrade: tiers could not be extracted out of the invoice'
    );

    expectSubscriptionServiceNotToHaveBeenCalled(createFn, renewFn, upgradeFn, downgradeFn);
  });

  it('should handle upgrade when first tier extraction fails but second succeeds', async () => {
    const createFn = vi.fn();
    const renewFn = vi.fn();
    const upgradeFn = vi.fn();
    const downgradeFn = vi.fn();

    const partiallyValidUpgradeInvoice: Stripe.Invoice = {
      ...validUpgradeInvoice,
      lines: {
        data: [
          {
            ...validInvoiceLineItem,
            pricing: {
              price_details: {
                price: 'unknown_price_id'
              }
            }
          },
          validBetterLineItem
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
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Error while doing upgrade: tiers could not be extracted out of the invoice'
    );

    expectSubscriptionServiceNotToHaveBeenCalled(createFn, renewFn, upgradeFn, downgradeFn);
  });

  function testIt(
    event: Stripe.InvoicePaymentSucceededEvent,
    identity: Identity<IdpName>,
    createFn: (userId: UserId, tierId: TierId) => Promise<CreditAdditionResult>,
    renewFn: (userId: UserId, tierId: TierId) => Promise<CreditAdditionResult>,
    upgradeFn: (
      userId: UserId,
      previousTier: TierId,
      currentTier: TierId,
      period: Period,
      created: UnixTimestamp
    ) => Promise<void>,
    downgradeFn: (userId: UserId) => Promise<void>,
    tiers: Tiers
  ): Promise<void> {
    const subscriptionServiceMock = {
      create: createFn,
      renew: renewFn,
      upgrade: upgradeFn,
      downgrade: downgradeFn
    } as unknown as SubscriptionService<IdpName>;

    const loggerMock = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as unknown as Logger;

    const handler = new InvoicePaymentSucceededHandler(
      'invoice.payment_succeeded',
      tiers,
      subscriptionServiceMock,
      loggerMock
    );

    return handler.handle(event, identity);
  }

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

  function expectSubscriptionServiceNotToHaveBeenCalled(
    createFn: Mock,
    renewFn: Mock,
    upgradeFn: Mock,
    downgradeFn: Mock
  ): void {
    expect(createFn).not.toHaveBeenCalled();
    expect(renewFn).not.toHaveBeenCalled();
    expect(upgradeFn).not.toHaveBeenCalled();
    expect(downgradeFn).not.toHaveBeenCalled();
  }
});
