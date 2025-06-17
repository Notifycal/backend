/* eslint-disable camelcase */
import type { Logger } from '@aws-lambda-powertools/logger';
import type { TierId, Tiers } from '@model/PaymentPlans';
import type { Email, Identity, IdpId, IdpName, UserId } from '@notifycal/shared/types';
import type { CreditAdditionResult } from '@services/credits-service';
import type { SubscriptionService } from '@services/subscription-service';
import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import { InvoicePaymentSucceededHandler } from './invoice';

describe(InvoicePaymentSucceededHandler, () => {
  const validIdentity: Identity<IdpName> = {
    userId: 'user-123' as UserId,
    email: 'user@example.com' as Email,
    idp: 'google.com',
    idpId: '42524352354' as IdpId
  };

  const validTiers: Tiers = {
    good: {
      id: 'tier-basic' as TierId,
      priceId: 'price_basic_123'
    },
    better: {
      id: 'tier-premium' as TierId,
      priceId: 'price_premium_456'
    },
    best: {
      id: 'tier-best' as TierId,
      priceId: 'price_best_456'
    }
  };

  const validInvoiceBase = {
    id: 'in_test123',
    customer: 'cus_test456',
    amount_paid: 2000,
    lines: {
      data: [
        {
          pricing: {
            price_details: {
              price: 'price_basic_123'
            }
          }
        }
      ]
    }
  };

  const validSubscriptionCreateInvoice = {
    ...validInvoiceBase,
    billing_reason: 'subscription_create'
  } as Stripe.Invoice;

  const validSubscriptionCycleInvoice = {
    ...validInvoiceBase,
    billing_reason: 'subscription_cycle'
  } as Stripe.Invoice;

  const validUnknownBillingReasonInvoice = {
    ...validInvoiceBase,
    billing_reason: 'subscription_update'
  } as Stripe.Invoice;

  const validInvoiceWithUnknownPriceId = {
    ...validInvoiceBase,
    billing_reason: 'subscription_create',
    lines: {
      data: [
        {
          pricing: {
            price_details: {
              price: 'unknown_price_id'
            }
          }
        }
      ]
    }
  } as Stripe.Invoice;

  const validEvent: Stripe.InvoicePaymentSucceededEvent = {
    id: 'evt_test',
    object: 'event',
    created: Date.now(),
    data: {
      object: validSubscriptionCreateInvoice
    },
    type: 'invoice.payment_succeeded'
  } as Stripe.InvoicePaymentSucceededEvent;

  const validSuccessResult: CreditAdditionResult = {
    success: true,
    operationId: 'Success',
    subscriptionCreditBalance: 40
  };

  const validErrorResult: CreditAdditionResult = {
    success: false,
    operationId: 'UnknownError',
    error: new Error('Subscription service failed')
  };

  it('should handle subscription_create billing reason successfully', async () => {
    const loggerMock = createLoggerMock();
    const createSubscriptionFn = vi.fn().mockResolvedValue(validSuccessResult);
    const renewSubscriptionFn = vi.fn();

    const eventWithCreate = {
      ...validEvent,
      data: { object: validSubscriptionCreateInvoice }
    };

    await testIt(
      eventWithCreate,
      validIdentity,
      loggerMock,
      createSubscriptionFn,
      renewSubscriptionFn,
      validTiers
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(loggerMock.info).toHaveBeenCalledWith(
      'Handling invoice payment succeeded',
      expect.objectContaining({
        invoiceId: validSubscriptionCreateInvoice.id,
        customerId: validSubscriptionCreateInvoice.customer,
        amount: validSubscriptionCreateInvoice.amount_paid,
        billingReason: 'subscription_create',
        userId: validIdentity.userId
      })
    );
    expect(createSubscriptionFn).toHaveBeenCalledTimes(1);
    expect(createSubscriptionFn).toHaveBeenCalledWith(validIdentity.userId, 'tier-basic');
    expect(renewSubscriptionFn).not.toHaveBeenCalled();
  });

  it('should handle subscription_cycle billing reason successfully', async () => {
    const loggerMock = createLoggerMock();
    const createSubscriptionFn = vi.fn();
    const renewSubscriptionFn = vi.fn().mockResolvedValue(validSuccessResult);

    const eventWithCycle = {
      ...validEvent,
      data: { object: validSubscriptionCycleInvoice }
    };

    await testIt(
      eventWithCycle,
      validIdentity,
      loggerMock,
      createSubscriptionFn,
      renewSubscriptionFn,
      validTiers
    );

    expect(renewSubscriptionFn).toHaveBeenCalledTimes(1);
    expect(renewSubscriptionFn).toHaveBeenCalledWith(validIdentity.userId, 'tier-basic');
    expect(createSubscriptionFn).not.toHaveBeenCalled();
  });

  it('should extract correct tier from premium price', async () => {
    const loggerMock = createLoggerMock();
    const createSubscriptionFn = vi.fn().mockResolvedValue(validSuccessResult);
    const renewSubscriptionFn = vi.fn();

    const premiumInvoice = {
      ...validSubscriptionCreateInvoice,
      lines: {
        data: [
          {
            pricing: {
              price_details: {
                price: 'price_premium_456'
              }
            }
          }
        ]
      }
    } as Stripe.Invoice;

    const eventWithPremium = {
      ...validEvent,
      data: { object: premiumInvoice }
    };

    await testIt(
      eventWithPremium,
      validIdentity,
      loggerMock,
      createSubscriptionFn,
      renewSubscriptionFn,
      validTiers
    );

    expect(createSubscriptionFn).toHaveBeenCalledWith(validIdentity.userId, 'tier-premium');
  });

  it('should handle unknown billing reason without throwing error', async () => {
    const loggerMock = createLoggerMock();
    const createSubscriptionFn = vi.fn();
    const renewSubscriptionFn = vi.fn();

    const eventWithUnknownReason = {
      ...validEvent,
      data: { object: validUnknownBillingReasonInvoice }
    };

    await testIt(
      eventWithUnknownReason,
      validIdentity,
      loggerMock,
      createSubscriptionFn,
      renewSubscriptionFn,
      validTiers
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Unhandled billing reason',
      expect.objectContaining({
        invoiceId: validUnknownBillingReasonInvoice.id,
        billingReason: 'subscription_update'
      })
    );
    expect(createSubscriptionFn).not.toHaveBeenCalled();
    expect(renewSubscriptionFn).not.toHaveBeenCalled();
  });

  it('should throw error when price ID is not found in tiers', async () => {
    const loggerMock = createLoggerMock();
    const createSubscriptionFn = vi.fn();
    const renewSubscriptionFn = vi.fn();

    const eventWithUnknownPrice = {
      ...validEvent,
      data: { object: validInvoiceWithUnknownPriceId }
    };

    const result = testIt(
      eventWithUnknownPrice,
      validIdentity,
      loggerMock,
      createSubscriptionFn,
      renewSubscriptionFn,
      validTiers
    );

    await expect(result).rejects.toThrow(
      'Unknown price ID: unknown_price_id. No matching tier found.'
    );
  });

  it('should reject when subscription service returns UnknownError', async () => {
    const loggerMock = createLoggerMock();
    const createSubscriptionFn = vi.fn().mockResolvedValue(validErrorResult);
    const renewSubscriptionFn = vi.fn();

    const result = testIt(
      validEvent,
      validIdentity,
      loggerMock,
      createSubscriptionFn,
      renewSubscriptionFn,
      validTiers
    );

    await expect(result).rejects.toBe(validErrorResult.error);
  });

  it('should handle renew subscription with UnknownError', async () => {
    const loggerMock = createLoggerMock();
    const createSubscriptionFn = vi.fn();
    const renewSubscriptionFn = vi.fn().mockResolvedValue(validErrorResult);

    const eventWithCycle = {
      ...validEvent,
      data: { object: validSubscriptionCycleInvoice }
    };

    const result = testIt(
      eventWithCycle,
      validIdentity,
      loggerMock,
      createSubscriptionFn,
      renewSubscriptionFn,
      validTiers
    );

    await expect(result).rejects.toBe(validErrorResult.error);
  });

  function createLoggerMock() {
    return {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as unknown as Logger;
  }

  function testIt(
    event: Stripe.InvoicePaymentSucceededEvent,
    identity: Identity<IdpName>,
    logger: Logger,
    createSubscriptionFn: () => Promise<CreditAdditionResult>,
    renewSubscriptionFn: () => Promise<CreditAdditionResult>,
    tiers: Tiers
  ): Promise<void> {
    const subscriptionServiceMock = {
      createSubscription: createSubscriptionFn,
      renewSubscription: renewSubscriptionFn
    } as unknown as SubscriptionService<IdpName>;

    const handler = new InvoicePaymentSucceededHandler(logger, subscriptionServiceMock, tiers);

    return handler.handle(event, identity);
  }
});
