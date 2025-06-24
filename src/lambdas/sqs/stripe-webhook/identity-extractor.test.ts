/* eslint-disable camelcase */
import type { Logger } from '@aws-lambda-powertools/logger';
import type { PaymentUserStoreRecord } from '@model/store/UserPaymentStoreRecord';
import type { UserIdentity } from '@model/UserIdentity';
import type {
  Email,
  Identity,
  IdpId,
  IdpName,
  StripeCustomerId,
  UserId
} from '@notifycal/shared/types';
import type { PaymentUserIndexStore } from '@services/stores/user-payment-index-store';
import type { Stripe } from 'stripe';
import { v4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { StripeIdentityExtractor } from './identity-extractor';

describe(StripeIdentityExtractor, () => {
  const validStripeCustomerId = 'cus_123' as StripeCustomerId;
  const validUserId = v4() as UserId;
  const validIdp = 'google.com';
  const validIdpId = 'google_456' as IdpId;
  const validEmail = 'test@notifycal.com' as Email;

  const validPaymentUser: PaymentUserStoreRecord<IdpName> = {
    StripeCustomerId: validStripeCustomerId,
    UserId: validUserId,
    Idp: validIdp,
    IdpId: validIdpId,
    Email: validEmail
  };

  const validIdentity: Identity<IdpName> = {
    userId: validUserId,
    idp: validIdp,
    idpId: validIdpId,
    email: validEmail
  };

  const validCustomerObject: Stripe.Customer = {
    id: validStripeCustomerId,
    object: 'customer',
    created: 1234567890,
    email: validEmail,
    livemode: false,
    metadata: {},
    subscriptions: {}
  } as unknown as Stripe.Customer;

  const validSubscriptionObject: Stripe.Subscription = {
    id: 'sub_123',
    object: 'subscription',
    customer: validStripeCustomerId,
    created: 1234567890,
    status: 'active',
    metadata: {}
  } as unknown as Stripe.Subscription;

  const validInvoiceObject: Stripe.Invoice = {
    id: 'in_123',
    object: 'invoice',
    customer: validStripeCustomerId,
    created: 1234567890,
    status: 'paid',
    metadata: {}
  } as unknown as Stripe.Invoice;

  const validPaymentIntentObject: Stripe.PaymentIntent = {
    id: 'pi_123',
    object: 'payment_intent',
    customer: validStripeCustomerId,
    amount: 1000,
    currency: 'usd',
    created: 1234567890,
    status: 'succeeded',
    metadata: {}
  } as unknown as Stripe.PaymentIntent;

  const validCheckoutSessionObject: Stripe.Checkout.Session = {
    id: 'cs_123',
    object: 'checkout.session',
    customer: validStripeCustomerId,
    created: 1234567890,
    mode: 'payment',
    status: 'complete',
    metadata: {}
  } as unknown as Stripe.Checkout.Session;

  describe('customer events', () => {
    it('should extract identity from customer.created event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validCustomerObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.created'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from customer.updated event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validCustomerObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.updated'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from customer.deleted event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validCustomerObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.deleted'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });
  });

  describe('subscription events', () => {
    it('should extract identity from customer.subscription.created event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validSubscriptionObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.subscription.created'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from customer.subscription.updated event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validSubscriptionObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.subscription.updated'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from customer.subscription.deleted event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validSubscriptionObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.subscription.deleted'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from customer.subscription.paused event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validSubscriptionObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.subscription.paused'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from customer.subscription.resumed event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validSubscriptionObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.subscription.resumed'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });
  });

  describe('invoice events', () => {
    it('should extract identity from invoice.created event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validInvoiceObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'invoice.created'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from invoice.payment_succeeded event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validInvoiceObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'invoice.payment_succeeded'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from invoice.payment_failed event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validInvoiceObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'invoice.payment_failed'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });
  });

  describe('payment intent events', () => {
    it('should extract identity from payment_intent.succeeded event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validPaymentIntentObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'payment_intent.succeeded'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from payment_intent.payment_failed event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validPaymentIntentObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'payment_intent.payment_failed'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });
  });

  describe('checkout session events', () => {
    it('should extract identity from checkout.session.completed event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validCheckoutSessionObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'checkout.session.completed'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });
  });

  describe('customer ID extraction with different object types', () => {
    it('should extract customer ID when customer is a string', async () => {
      const subscriptionWithStringCustomer: Stripe.Subscription = {
        ...validSubscriptionObject,
        customer: validStripeCustomerId
      };

      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: subscriptionWithStringCustomer },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.subscription.created'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract customer ID when customer is a Customer object', async () => {
      const subscriptionWithCustomerObject: Stripe.Subscription = {
        ...validSubscriptionObject,
        customer: validCustomerObject
      };

      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: subscriptionWithCustomerObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.subscription.created'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(validPaymentUser);
      const errorLoggerFn = vi.fn();

      const result = await testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn);

      expect(result).toStrictEqual(validIdentity);
    });
  });

  describe('error cases', () => {
    it('should throw error when event type is not supported', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'prod_123',
            object: 'product'
          } as Stripe.Product
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'product.created'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn();
      const errorLoggerFn = vi.fn();

      await expect(testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn)).rejects.toThrow(
        'No customer id found in Stripe event of type product.created'
      );

      expect(errorLoggerFn).toHaveBeenCalledWith(
        'No customer id extractor from event of type product.created'
      );
    });

    it('should throw error when customer field is null', async () => {
      const subscriptionWithNullCustomer: Stripe.Subscription = {
        ...validSubscriptionObject,
        customer: null
      } as unknown as Stripe.Subscription;

      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: subscriptionWithNullCustomer },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.subscription.created'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn();
      const errorLoggerFn = vi.fn();

      await expect(testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn)).rejects.toThrow(
        'No customer id found in Stripe event of type customer.subscription.created'
      );
    });

    it('should throw error when customer is not found in store', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validCustomerObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.created'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(null);
      const errorLoggerFn = vi.fn();

      await expect(testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn)).rejects.toThrow(
        `No customer found in our persistence with id ${validStripeCustomerId}. Result null`
      );
    });

    it('should throw error when customer is undefined in store', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validCustomerObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.created'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockResolvedValue(undefined);
      const errorLoggerFn = vi.fn();

      await expect(testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn)).rejects.toThrow(
        `No customer found in our persistence with id ${validStripeCustomerId}. Result undefined`
      );
    });

    it('should throw error when store lookup fails', async () => {
      const originalError = new Error('Database connection failed');
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: { object: validCustomerObject },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.created'
      };

      const getIdentityByStripeCustomerIdFn = vi.fn().mockRejectedValue(originalError);
      const errorLoggerFn = vi.fn();

      await expect(testIt(event, getIdentityByStripeCustomerIdFn, errorLoggerFn)).rejects.toThrow(
        `No customer found in our persistence with id ${validStripeCustomerId}`
      );
    });
  });

  function testIt(
    event: Stripe.Event,
    getIdentityByStripeCustomerIdFn: () => Promise<Identity<IdpName> | null | undefined>,
    errorLoggerFn: () => void
  ): Promise<Identity<IdpName>> {
    const userPaymentIndexStoreMock = {
      getIdentityByStripeCustomerId: getIdentityByStripeCustomerIdFn
    } as unknown as PaymentUserIndexStore<IdpName>;

    const loggerMock = {
      error: errorLoggerFn
    } as unknown as Logger;

    const extractor = new StripeIdentityExtractor(userPaymentIndexStoreMock, loggerMock);
    return extractor.extract(event);
  }
});