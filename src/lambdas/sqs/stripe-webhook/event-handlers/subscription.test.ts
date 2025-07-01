import { logger } from '@common/powertools';
import type { Identity, IdpName } from '@notifycal/shared/types';
import type { SubscriptionService } from '@services/subscription';
import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import type { StripeEventType } from '../stripe-schemas';
import { SubscriptionDeletedHandler, SubscriptionUpdatedHandler } from './subscription';

const validIdentity = { userId: 'user-123' } as Identity<IdpName>;
const baseSubscription = {
  id: 'sub_123',
  customer: 'cus_456',
  status: 'active'
} as Stripe.Subscription;

function validEvent<T extends Stripe.Event>(
  type: T['type'],
  object: Partial<Stripe.Subscription> = {}
): T {
  return {
    type,
    data: {
      object: { ...baseSubscription, ...object }
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

    await testIt(event, cancelFn);

    expect(cancelFn).toHaveBeenCalledWith('user-123', 'unpaid');
  });

  it('should not cancel subscription when status from event is active', async () => {
    const cancelFn = vi.fn().mockResolvedValue(undefined);
    const event = validEvent<Stripe.CustomerSubscriptionUpdatedEvent>(
      'customer.subscription.updated',
      { status: 'active' }
    );

    await testIt(event, cancelFn);

    expect(cancelFn).not.toHaveBeenCalled();
  });

  it('should propagate errors from cancel()', async () => {
    const error = new Error('cancel error');
    const cancelFn = vi.fn().mockRejectedValue(error);
    const event = validEvent<Stripe.CustomerSubscriptionUpdatedEvent>(
      'customer.subscription.updated',
      { status: 'canceled' }
    );

    await expect(testIt(event, cancelFn)).rejects.toThrow(
      `Error while handling subscription-unpaid in ${stripeEventType} event handler. Error: ${error.message}`
    );
  });

  function testIt(
    event: Stripe.CustomerSubscriptionUpdatedEvent,
    cancelFn: (userId: string, reason: string) => Promise<void>
  ) {
    const subscriptionServiceMock = {
      cancel: cancelFn
    } as unknown as SubscriptionService<IdpName>;

    const handler = new SubscriptionUpdatedHandler(
      stripeEventType,
      subscriptionServiceMock,
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

    expect(cancelFn).toHaveBeenCalledWith('user-123', 'cancelled');
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
