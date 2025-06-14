/* eslint-disable camelcase */
import type { Logger } from '@aws-lambda-powertools/logger';
import { Email, IdpId, UserId } from '@notifycal/shared/types';
import type { AwsArn } from '@own-types/model';
import { validStripeEventBridgeEvent as _validStripeEventBridgeEvent } from '@testing/data/stripe-event-bridge-event';
import type { Stripe } from 'stripe';
import { v4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import type { StripeWebhookConfig } from './config';
import { defaultEventHandlers, recordProcessor } from './record-processor';
import type { Record } from './schema';

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
    paymentPlans: {
      tiers: {
        good: {
          id: 'good',
          priceId: 'wsdrvwefg'
        },
        better: {
          id: 'better',
          priceId: 'wsdrvwefg'
        },
        best: {
          id: 'best',
          priceId: 'wsdrvwefg'
        }
      }
    },
    paymentWebhookTopicConfig: {
      topicArn: 'payment-webhook-topic' as AwsArn
    }
  };

  it.only('should process a customer.created event successfully', () => {
    const infoLoggerFn = vi.fn();

    return testIt(validStripeEventBridgeEvent, defaultEventHandlers, validConfig, {
      info: infoLoggerFn,
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      appendKeys: vi.fn()
    } as unknown as Logger).then(() => {
      expect(infoLoggerFn).toHaveBeenCalledWith(
        'Processing Stripe webhook event',
        expect.objectContaining({
          eventId: 'evt_test_webhook',
          eventType: 'customer.created',
          livemode: false,
          stripeApiVersion: '2023-10-16'
        })
      );
    });
  });

  it('should process an invoice.payment_succeeded event with credits service', () => {
    const infoLoggerFn = vi.fn();
    const invoiceEvent: Stripe.Event = {
      ...validStripeEventPart,
      id: 'evt_invoice_payment',
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          metadata: validMetadata,
          id: 'in_test_invoice',
          object: 'invoice',
          customer: 'cus_test_customer',
          amount_paid: 2000
        }
      }
    } as Stripe.Event;

    return testIt(_validStripeEventBridgeEvent(invoiceEvent), defaultEventHandlers, validConfig, {
      info: infoLoggerFn,
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      appendKeys: vi.fn()
    } as unknown as Logger).then(() => {
      expect(infoLoggerFn).toHaveBeenCalledWith(
        'Processing Stripe webhook event',
        expect.objectContaining({
          eventId: 'evt_invoice_payment',
          eventType: 'invoice.payment_succeeded'
        })
      );
    });
  });

  it('should process a subscription.updated event', () => {
    const infoLoggerFn = vi.fn();
    const subscriptionEvent: Stripe.CustomerSubscriptionUpdatedEvent = {
      ...validStripeEventPart,
      id: 'evt_subscription_updated',
      type: 'customer.subscription.updated',
      data: {
        object: {
          metadata: validMetadata,
          id: 'sub_test_subscription',
          object: 'subscription',
          customer: 'cus_test_customer',
          status: 'active'
        } as Stripe.CustomerSubscriptionUpdatedEvent['data']['object']
      }
    };

    return testIt(
      _validStripeEventBridgeEvent(subscriptionEvent),
      defaultEventHandlers,
      validConfig,
      {
        info: infoLoggerFn,
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        appendKeys: vi.fn()
      } as unknown as Logger
    ).then(() => {
      expect(infoLoggerFn).toHaveBeenCalledWith(
        'Processing Stripe webhook event',
        expect.objectContaining({
          eventId: 'evt_subscription_updated',
          eventType: 'customer.subscription.updated'
        })
      );
    });
  });

  it('should handle unhandled event types by rejecting with error', () => {
    const unhandledEvent: Stripe.AccountUpdatedEvent = {
      ...validStripeEventPart,
      id: 'evt_unhandled',
      type: 'account.updated' as const,
      data: {
        object: {
          metadata: validMetadata,
          id: 'acct_test_account',
          object: 'account',
          charges_enabled: true,
          details_submitted: true,
          payouts_enabled: true,
          type: 'standard'
        } as Stripe.AccountUpdatedEvent['data']['object']
      }
    };
    const unhandledRecord = _validStripeEventBridgeEvent(unhandledEvent);
    return expect(testIt(unhandledRecord)).rejects.toThrow('Unhandled event type: account.updated');
  });

  it('should use custom event handlers when provided', () => {
    const mockHandler = {
      handle: vi.fn().mockResolvedValue(undefined)
    };

    const customEventHandlers = vi
      .fn()
      .mockReturnValue(new Map([['customer.created', mockHandler]]));

    return testIt(validStripeEventBridgeEvent, customEventHandlers, validConfig, {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      appendKeys: vi.fn()
    } as unknown as Logger).then(() => {
      expect(customEventHandlers).toHaveBeenCalledWith(
        expect.any(Object),
        validConfig.paymentPlans.tiers,
        expect.any(Object)
      );
    });
  });

  it('should log event details with correct structure', () => {
    const infoLoggerFn = vi.fn();
    const eventWithNullApiVersion: Stripe.CustomerCreatedEvent = {
      ...validStripeEventBridgeEvent,
      api_version: undefined
    } as unknown as Stripe.CustomerCreatedEvent;

    return testIt(
      _validStripeEventBridgeEvent(eventWithNullApiVersion),
      defaultEventHandlers,
      validConfig,
      {
        info: infoLoggerFn,
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        appendKeys: vi.fn()
      } as unknown as Logger
    ).then(() => {
      expect(infoLoggerFn).toHaveBeenCalledWith(
        'Processing Stripe webhook event',
        expect.objectContaining({
          eventId: 'evt_test_webhook',
          eventType: 'customer.created',
          livemode: false,
          stripeApiVersion: undefined
        })
      );
    });
  });

  it('should process payment_intent.succeeded event', () => {
    const infoLoggerFn = vi.fn();
    const paymentIntentEvent: Stripe.Event = {
      ...validStripeEventPart,
      id: 'evt_payment_intent',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          metadata: validMetadata,
          id: 'pi_test_payment_intent',
          object: 'payment_intent',
          amount: 2000,
          currency: 'usd',
          status: 'succeeded'
        }
      }
    } as Stripe.Event;

    return testIt(
      _validStripeEventBridgeEvent(paymentIntentEvent),
      defaultEventHandlers,
      validConfig,
      {
        info: infoLoggerFn,
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        appendKeys: vi.fn()
      } as unknown as Logger
    ).then(() => {
      expect(infoLoggerFn).toHaveBeenCalledWith(
        'Processing Stripe webhook event',
        expect.objectContaining({
          eventId: 'evt_payment_intent',
          eventType: 'payment_intent.succeeded'
        })
      );
    });
  });

  it('should handle customer.deleted event', () => {
    const infoLoggerFn = vi.fn();
    const customerDeletedEvent: Stripe.CustomerDeletedEvent = {
      ...validStripeEventPart,
      id: 'evt_customer_deleted',
      type: 'customer.deleted',
      data: {
        object: {
          metadata: validMetadata,
          id: 'cus_deleted_customer',
          object: 'customer',
          deleted: undefined
        } as Stripe.CustomerDeletedEvent['data']['object']
      }
    };

    return testIt(
      _validStripeEventBridgeEvent(customerDeletedEvent),
      defaultEventHandlers,
      validConfig,
      {
        info: infoLoggerFn,
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        appendKeys: vi.fn()
      } as unknown as Logger
    ).then(() => {
      expect(infoLoggerFn).toHaveBeenCalledWith(
        'Processing Stripe webhook event',
        expect.objectContaining({
          eventId: 'evt_customer_deleted',
          eventType: 'customer.deleted'
        })
      );
    });
  });

  it('should process invoice.payment_failed event', () => {
    const infoLoggerFn = vi.fn();
    const invoiceFailedEvent: Stripe.InvoicePaymentFailedEvent = {
      ...validStripeEventPart,
      id: 'evt_invoice_failed',
      type: 'invoice.payment_failed',
      data: {
        object: {
          metadata: validMetadata,
          id: 'in_failed_invoice',
          object: 'invoice',
          customer: 'cus_test_customer',
          amount_due: 2000,
          status: 'open'
        } as unknown as Stripe.Invoice
      }
    };

    return testIt(
      _validStripeEventBridgeEvent(invoiceFailedEvent),
      defaultEventHandlers,
      validConfig,
      {
        info: infoLoggerFn,
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        appendKeys: vi.fn()
      } as unknown as Logger
    ).then(() => {
      expect(infoLoggerFn).toHaveBeenCalledWith(
        'Processing Stripe webhook event',
        expect.objectContaining({
          eventId: 'evt_invoice_failed',
          eventType: 'invoice.payment_failed'
        })
      );
    });
  });

  function testIt(
    record: Record['body'],
    eventHandlersFn: typeof defaultEventHandlers = defaultEventHandlers,
    config: StripeWebhookConfig = validConfig,
    logger: Logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      appendKeys: vi.fn()
    } as unknown as Logger
  ): Promise<void> {
    return recordProcessor(record, eventHandlersFn, config, logger);
  }
});
