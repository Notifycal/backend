/* eslint-disable camelcase */
import type { Email, Identity, IdpId, IdpName, UserId } from '@notifycal/shared/types';
import type { Stripe } from 'stripe';
import { describe, expect, it } from 'vitest';
import { StripeIdentityExtractor } from './identity-extractor';

describe(StripeIdentityExtractor, () => {
  const validUserId = 'user_123' as UserId;
  const validIdp = 'google' as IdpName;
  const validIdpId = 'google_456' as IdpId;
  const validEmail = 'test@notifycal.com' as Email;

  const validMetadata: Stripe.Metadata = {
    userId: validUserId,
    idp: validIdp,
    idpId: validIdpId,
    email: validEmail
  };

  const validIdentity: Identity<IdpName> = {
    userId: validUserId,
    idp: validIdp,
    idpId: validIdpId,
    email: validEmail
  };

  describe('customer events', () => {
    it('should extract identity from customer.created event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'cus_123',
            object: 'customer',
            metadata: validMetadata
          } as Stripe.Customer
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.created'
      };

      const result = await testIt(event);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from customer.updated event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'cus_123',
            object: 'customer',
            metadata: validMetadata
          } as Stripe.Customer
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.updated'
      };

      const result = await testIt(event);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from customer.deleted event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'cus_123',
            object: 'customer',
            metadata: validMetadata
          } as Stripe.Customer
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.deleted'
      };

      const result = await testIt(event);

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
        data: {
          object: {
            id: 'sub_123',
            object: 'subscription',
            metadata: validMetadata
          } as Stripe.Subscription
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.subscription.created'
      };

      const result = await testIt(event);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from customer.subscription.updated event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'sub_123',
            object: 'subscription',
            metadata: validMetadata
          } as Stripe.Subscription
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.subscription.updated'
      };

      const result = await testIt(event);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from customer.subscription.deleted event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'sub_123',
            object: 'subscription',
            metadata: validMetadata
          } as Stripe.Subscription
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.subscription.deleted'
      };

      const result = await testIt(event);

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
        data: {
          object: {
            id: 'in_123',
            object: 'invoice',
            metadata: validMetadata
          } as Stripe.Invoice
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'invoice.created'
      };

      const result = await testIt(event);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from invoice.payment_succeeded event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'in_123',
            object: 'invoice',
            metadata: validMetadata
          } as Stripe.Invoice
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'invoice.payment_succeeded'
      };

      const result = await testIt(event);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from invoice.payment_failed event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'in_123',
            object: 'invoice',
            metadata: validMetadata
          } as Stripe.Invoice
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'invoice.payment_failed'
      };

      const result = await testIt(event);

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
        data: {
          object: {
            id: 'pi_123',
            object: 'payment_intent',
            metadata: validMetadata
          } as Stripe.PaymentIntent
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'payment_intent.succeeded'
      };

      const result = await testIt(event);

      expect(result).toStrictEqual(validIdentity);
    });

    it('should extract identity from payment_intent.payment_failed event', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'pi_123',
            object: 'payment_intent',
            metadata: validMetadata
          } as Stripe.PaymentIntent
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'payment_intent.payment_failed'
      };

      const result = await testIt(event);

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

      await expect(testIt(event)).rejects.toThrow(
        'No metadata found in Stripe event of type product.created'
      );
    });

    it('should throw error when userId is missing from metadata', async () => {
      const invalidMetadata: Stripe.Metadata = {
        idp: validIdp,
        idpId: validIdpId,
        email: validEmail
      };

      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'cus_123',
            object: 'customer',
            metadata: invalidMetadata
          } as Stripe.Customer
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.created'
      };

      await expect(testIt(event)).rejects.toThrow(
        'No userId found in Stripe metadata for event customer.created'
      );
    });

    it('should throw error when idp is missing from metadata', async () => {
      const invalidMetadata: Stripe.Metadata = {
        userId: validUserId,
        idpId: validIdpId,
        email: validEmail
      };

      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'cus_123',
            object: 'customer',
            metadata: invalidMetadata
          } as Stripe.Customer
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.created'
      };

      await expect(testIt(event)).rejects.toThrow(
        'No idp found in Stripe metadata for event customer.created'
      );
    });

    it('should throw error when idpId is missing from metadata', async () => {
      const invalidMetadata: Stripe.Metadata = {
        userId: validUserId,
        idp: validIdp,
        email: validEmail
      };

      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'cus_123',
            object: 'customer',
            metadata: invalidMetadata
          } as Stripe.Customer
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.created'
      };

      await expect(testIt(event)).rejects.toThrow(
        'No idpId found in Stripe metadata for event customer.created'
      );
    });

    it('should throw error when email is missing from metadata', async () => {
      const invalidMetadata: Stripe.Metadata = {
        userId: validUserId,
        idp: validIdp,
        idpId: validIdpId
      };

      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'cus_123',
            object: 'customer',
            metadata: invalidMetadata
          } as Stripe.Customer
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.created'
      };

      await expect(testIt(event)).rejects.toThrow(
        'No email found in Stripe metadata for event customer.created'
      );
    });

    it('should throw error when metadata is completely empty', async () => {
      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2020-08-27',
        created: 1234567890,
        data: {
          object: {
            id: 'cus_123',
            object: 'customer',
            metadata: {}
          } as Stripe.Customer
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: null },
        type: 'customer.created'
      };

      await expect(testIt(event)).rejects.toThrow(
        'No userId found in Stripe metadata for event customer.created'
      );
    });
  });

  function testIt(event: Stripe.Event): Promise<Identity<IdpName>> {
    const extractor = new StripeIdentityExtractor();
    return extractor.extract(event);
  }
});
