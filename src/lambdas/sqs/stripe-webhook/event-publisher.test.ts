/* eslint-disable camelcase */
import {
  toNotifycalEvent,
  type PaymentWebhookFiredEvent
} from '@model/app-events/StripeWebhookEventFiredEvent';
import type { Email, Identity, IdpId, IdpName, UserId } from '@notifycal/shared/types';
import type { SnsService } from '@services/sns';
import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import { StripeEventPublisher } from './event-publisher';

describe(StripeEventPublisher, () => {
  const validIdentity: Identity<IdpName> = {
    userId: 'user-123' as UserId,
    idp: 'google' as IdpName,
    idpId: 'google-id-123' as IdpId,
    email: 'test@notifycal.es' as Email
  };

  const validEvent: Stripe.Event = {
    id: 'evt_123',
    object: 'event',
    api_version: '2023-10-16',
    created: 1234567890,
    data: {
      object: {},
      previous_attributes: {}
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type: 'customer.created'
  } as Stripe.Event;

  const mockNotifycalEvent = {
    eventType: 'StripeWebhookEventFired',
    correlationId: 'evt_123'
  } as unknown as PaymentWebhookFiredEvent;

  it('should create a publisher that transforms and publishes events', async () => {
    const publishFn = vi.fn().mockResolvedValue(undefined);
    const snsServiceMock = {
      publish: publishFn
    } as unknown as SnsService;

    vi.mocked(toNotifycalEvent).mockReturnValue(mockNotifycalEvent);

    await new StripeEventPublisher(snsServiceMock).publish(validEvent, validIdentity);

    expect(toNotifycalEvent).toHaveBeenCalledTimes(1);
    expect(toNotifycalEvent).toHaveBeenCalledWith(
      validEvent,
      'user-123',
      'google',
      'google-id-123'
    );

    expect(publishFn).toHaveBeenCalledTimes(1);
    expect(publishFn).toHaveBeenCalledWith(mockNotifycalEvent);
  });

  it('should propagate errors from SNS publish', async () => {
    const publishError = new Error('SNS publish failed');
    const publishFn = vi.fn().mockRejectedValue(publishError);
    const snsServiceMock = {
      publish: publishFn
    } as unknown as SnsService;

    vi.mocked(toNotifycalEvent).mockReturnValue(mockNotifycalEvent);

    const publisher = new StripeEventPublisher(snsServiceMock);

    await expect(publisher.publish(validEvent, validIdentity)).rejects.toThrow(publishError);

    expect(toNotifycalEvent).toHaveBeenCalledTimes(1);
  });
});
