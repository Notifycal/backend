/* eslint-disable camelcase */
import { logger } from '@common/powertools';
import type { IdpName, UserIdentity } from '@notifycal/shared/types';
import type { StripeService } from '@services/stripe';
import type { SubscriptionService } from '@services/subscription';
import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import type { StripeEventType } from '../stripe-schemas';
import { SubscriptionDeletedHandler, SubscriptionUpdatedHandler } from './subscription';

const validIdentity = { userId: 'user-123' } as UserIdentity<IdpName>;
const baseSubscription = {
  id: 'sub_123',
  customer: 'cus_456',
  status: 'active'
} as Stripe.Subscription;

function validEvent<T extends Stripe.Event>(
  type: T['type'],
  object: Partial<Stripe.Subscription> = {},
  previousAttributes?: Record<string, unknown>
): T {
  return {
    type,
    data: {
      object: { ...baseSubscription, ...object },
      ...(previousAttributes && { previous_attributes: previousAttributes })
    }
  } as T;
}

describe(SubscriptionUpdatedHandler, () => {
  const stripeEventType: StripeEventType = 'customer.subscription.updated';

  it('should cancel subscription when status is unpaid', async () => {
    const cancelFn = vi.fn().mockResolvedValue(undefined);
    const event = validEvent<Stripe.CustomerSubscriptionUpdatedEvent>(
      'customer.subscription.updated',
      { status: 'unpaid' }
    );

    await testIt(event, { cancelFn });

    expect(cancelFn).toHaveBeenCalledWith(validIdentity, 'unpaid');
  });

  it('should not cancel subscription when status from event is active', async () => {
    const cancelFn = vi.fn().mockResolvedValue(undefined);
    const event = validEvent<Stripe.CustomerSubscriptionUpdatedEvent>(
      'customer.subscription.updated',
      { status: 'active' }
    );

    await testIt(event, { cancelFn });

    expect(cancelFn).not.toHaveBeenCalled();
  });

  it('should propagate errors from cancel()', async () => {
    const error = new Error('cancel error');
    const cancelFn = vi.fn().mockRejectedValue(error);
    const event = validEvent<Stripe.CustomerSubscriptionUpdatedEvent>(
      'customer.subscription.updated',
      { status: 'canceled' }
    );

    await expect(testIt(event, { cancelFn })).rejects.toThrow(
      `Error while handling subscription-unpaid in ${stripeEventType} event handler. Error: ${error.message}`
    );
  });

  it('should end trial when payment method is added during trial', async () => {
    const endTrialFn = vi.fn().mockResolvedValue({
      id: 'sub_123',
      status: 'active',
      billing_cycle_anchor: 1234567890,
      trial_end: 1234567890
    } as Stripe.Subscription);
    const event = validEvent<Stripe.CustomerSubscriptionUpdatedEvent>(
      'customer.subscription.updated',
      { status: 'trialing', default_payment_method: 'pm_123' },
      { default_payment_method: null }
    );

    await testIt(event, { endTrialFn });

    expect(endTrialFn).toHaveBeenCalledWith('sub_123');
  });

  it('should not end trial if payment method already existed', async () => {
    const endTrialFn = vi.fn().mockResolvedValue({} as Stripe.Subscription);
    const event = validEvent<Stripe.CustomerSubscriptionUpdatedEvent>(
      'customer.subscription.updated',
      { status: 'trialing', default_payment_method: 'pm_123' },
      { default_payment_method: 'pm_123' }
    );

    await testIt(event, { endTrialFn });

    expect(endTrialFn).not.toHaveBeenCalled();
  });

  it('should not end trial if payment method is null', async () => {
    const endTrialFn = vi.fn().mockResolvedValue({} as Stripe.Subscription);
    const event = validEvent<Stripe.CustomerSubscriptionUpdatedEvent>(
      'customer.subscription.updated',
      { status: 'trialing', default_payment_method: null },
      { default_payment_method: null }
    );

    await testIt(event, { endTrialFn });

    expect(endTrialFn).not.toHaveBeenCalled();
  });

  it('should propagate errors from endTrialAndResetBillingCycle()', async () => {
    const error = new Error('stripe api error');
    const endTrialFn = vi.fn().mockRejectedValue(error);
    const event = validEvent<Stripe.CustomerSubscriptionUpdatedEvent>(
      'customer.subscription.updated',
      { status: 'trialing', default_payment_method: 'pm_123' },
      { default_payment_method: null }
    );

    await expect(testIt(event, { endTrialFn })).rejects.toThrowError(
      `Error while handling end-trial-on-payment-method-added in ${stripeEventType} event handler. Error: ${error.message}`
    );
  });

  function testIt(
    event: Stripe.CustomerSubscriptionUpdatedEvent,
    mocks?: {
      cancelFn?: (userId: string, reason: string) => Promise<void>;
      endTrialFn?: (subscriptionId: string) => Promise<Stripe.Subscription>;
    }
  ) {
    const subscriptionServiceMock = mocks?.cancelFn
      ? ({ cancel: mocks.cancelFn } as unknown as SubscriptionService<IdpName>)
      : ({} as SubscriptionService<IdpName>);

    const stripeServiceMock = mocks?.endTrialFn
      ? ({ endTrialAndResetBillingCycle: mocks.endTrialFn } as unknown as StripeService)
      : ({} as StripeService);

    const handler = new SubscriptionUpdatedHandler(
      stripeEventType,
      subscriptionServiceMock,
      stripeServiceMock,
      logger
    );
    return handler.handle(event, validIdentity);
  }
});

describe(SubscriptionDeletedHandler, () => {
  const stripeEventType: StripeEventType = 'customer.subscription.deleted';

  it('should cancel subscription with reason "cancelled"', async () => {
    const cancelFn = vi.fn().mockResolvedValue(undefined);
    const event = validEvent<Stripe.CustomerSubscriptionDeletedEvent>(
      'customer.subscription.deleted'
    );

    await testIt(event, cancelFn);

    expect(cancelFn).toHaveBeenCalledWith(validIdentity, 'cancelled');
  });

  it('should propagate errors from cancel()', async () => {
    const error = new Error('boom');
    const cancelFn = vi.fn().mockRejectedValue(error);
    const event = validEvent<Stripe.CustomerSubscriptionDeletedEvent>(
      'customer.subscription.deleted'
    );

    await expect(testIt(event, cancelFn)).rejects.toThrow(
      `Error while handling subscription-cancelled in ${stripeEventType} event handler. Error: ${error.message}`
    );
  });

  function testIt(
    event: Stripe.CustomerSubscriptionDeletedEvent,
    cancelFn: (userId: string, reason: string) => Promise<void>
  ) {
    const subscriptionServiceMock = {
      cancel: cancelFn
    } as unknown as SubscriptionService<IdpName>;

    const handler = new SubscriptionDeletedHandler(
      stripeEventType,
      subscriptionServiceMock,
      logger
    );
    return handler.handle(event, validIdentity);
  }
});
