/* eslint-disable camelcase */
import { logger } from '@common/powertools';
import type { Email, IdpId, UserId } from '@notifycal/shared/types';
import type { AwsArn } from '@own-types/model';
import { validPaymentPlans } from '@testing/data/pricing';
import { validStripeEventBridgeEvent as _validStripeEventBridgeEvent } from '@testing/data/stripe-event-bridge-event';
import type { EventBridgeEvent } from 'aws-lambda';
import type { Stripe } from 'stripe';
import { v4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import type { StripeWebhookConfig } from './config';
import { defaultEventHandlers, recordProcessor } from './record-processor';
import { StripeEventProcessor } from './stripe-event-processor';
import type { StripeEventType } from './stripe-schemas';

vi.mock('./stripe-event-processor');

describe(recordProcessor, () => {
  const validMetadata: Stripe.Metadata = {
    userId: v4() as UserId,
    idp: 'google.com',
    idpId: 'test_user_id' as IdpId,
    email: 'test@notifycal.com' as Email
  };

  const validStripeEventPart: Stripe.CustomerCreatedEvent = {
    id: 'evt_test_webhook',
    object: 'event',
    api_version: '2023-10-16',
    created: 1677649017,
    data: {
      object: {
        metadata: validMetadata,
        id: 'cus_test_customer',
        object: 'customer'
      } as Stripe.CustomerCreatedEvent['data']['object']
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: 'req_test_request',
      idempotency_key: null
    },
    type: 'customer.created' as const
  };

  const validStripeEventBridgeEvent = _validStripeEventBridgeEvent(validStripeEventPart);

  const validConfig: StripeWebhookConfig = {
    userBaseStoreConfig: {
      tableName: 'Users-local'
    },
    paymentUserIndexStoreConfig: {
      tableName: 'Users-local',
      indexName: 'PaymentUsers-local',
      pageSize: 100
    },
    paymentPlans: validPaymentPlans,
    paymentWebhookTopicConfig: {
      topicArn: 'payment-webhook-topic' as AwsArn
    },
    stripeAuthConfig: {
      apiKey: 'fake_api_key'
    }
  };

  it('should process an stripe event event successfully', async () => {
    const processFn = vi.fn().mockResolvedValue(undefined);

    const result = testIt(
      validStripeEventBridgeEvent,
      defaultEventHandlers,
      processFn,
      validConfig
    );

    await expect(result).resolves.toBeUndefined();
    expect(processFn).toHaveBeenCalledWith(validStripeEventBridgeEvent.detail);
  });

  it('should use custom event handlers when provided', async () => {
    const processFn = vi.fn().mockResolvedValue(undefined);
    const customEventHandlerFactory = vi.fn().mockReturnValue(new Map());

    const result = testIt(
      validStripeEventBridgeEvent,
      customEventHandlerFactory,
      processFn,
      validConfig
    );

    await expect(result).resolves.toBeUndefined();
    expect(customEventHandlerFactory).toHaveBeenCalledOnce();
    expect(processFn).toHaveBeenCalledWith(validStripeEventBridgeEvent.detail);
  });

  function testIt(
    record: EventBridgeEvent<StripeEventType, Stripe.Event>,
    eventHandlersFn: typeof defaultEventHandlers = defaultEventHandlers,
    processFn: () => Promise<void> = vi.fn().mockResolvedValue(undefined),
    config: StripeWebhookConfig = validConfig
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(StripeEventProcessor.prototype.process).mockImplementation(processFn);

    return recordProcessor(record, eventHandlersFn, config, logger);
  }
});
