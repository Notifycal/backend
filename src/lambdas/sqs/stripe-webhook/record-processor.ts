/* eslint-disable no-use-before-define */
import { logger } from '@common/powertools';
import type { TierId, Tiers } from '@model/PaymentPlans';
import type { IdpName, UserId } from '@notifycal/shared/types';
import { UserBaseStore } from '@services/stores/user-base-store';
import { tap } from '@utils/promises';
import type { Stripe } from 'stripe';
import { match } from 'ts-pattern';
import type { StripeWebhookConfig } from './config';
import { CreditsService } from './credit-service';
import type { Record } from './schema';

export function recordProcessor(record: Record, config: StripeWebhookConfig): Promise<void> {
  const stripeEvent = record.body.detail;
  logger.info('Processing Stripe webhook event', {
    eventId: stripeEvent.id,
    eventType: stripeEvent.type,
    livemode: stripeEvent.livemode,
    stripeApiVersion: stripeEvent.api_version,
    config
  });

  const userStore = UserBaseStore.withConfig(config.userBaseStoreConfig);
  const creditsService = new CreditsService(userStore);

  return match(stripeEvent)
    .with({ type: 'customer.created' }, (event) =>
      handleCustomerCreated(event as Stripe.CustomerCreatedEvent)
    )
    .with({ type: 'customer.updated' }, (event) =>
      handleCustomerUpdated(event as Stripe.CustomerUpdatedEvent)
    )
    .with({ type: 'customer.deleted' }, (event) =>
      handleCustomerDeleted(event as Stripe.CustomerDeletedEvent)
    )
    .with({ type: 'customer.subscription.created' }, (event) =>
      handleSubscriptionCreated(event as Stripe.CustomerSubscriptionCreatedEvent)
    )
    .with({ type: 'customer.subscription.updated' }, (event) =>
      handleSubscriptionUpdated(event as Stripe.CustomerSubscriptionUpdatedEvent)
    )
    .with({ type: 'customer.subscription.deleted' }, (event) =>
      handleSubscriptionDeleted(event as Stripe.CustomerSubscriptionDeletedEvent)
    )
    .with({ type: 'invoice.created' }, (event) =>
      handleInvoiceCreated(event as Stripe.InvoiceCreatedEvent)
    )
    .with({ type: 'invoice.payment_succeeded' }, (event) =>
      handleInvoicePaymentSucceeded(
        event as Stripe.InvoicePaymentSucceededEvent,
        creditsService,
        config.paymentPlans.tiers
      )
    )
    .with({ type: 'invoice.payment_failed' }, (event) =>
      handleInvoicePaymentFailed(event as Stripe.InvoicePaymentFailedEvent)
    )
    .with({ type: 'payment_intent.succeeded' }, (event) =>
      handlePaymentIntentSucceeded(event as Stripe.PaymentIntentSucceededEvent)
    )
    .with({ type: 'payment_intent.payment_failed' }, (event) =>
      handlePaymentIntentFailed(event as Stripe.PaymentIntentPaymentFailedEvent)
    )
    .otherwise((event) => {
      logger.error('Unhandled Stripe event type. Not retrying cause it will not fix anything', {
        eventType: event.type,
        eventId: event.id
      });
      return Promise.resolve();
    })
    .then(
      tap(() => {
        logger.info('Successfully processed Stripe webhook event', {
          eventId: stripeEvent.id,
          eventType: stripeEvent.type
        });
      })
    );
}

function extractTier(invoice: Stripe.Invoice, tiers: Tiers): TierId {
  const priceId = invoice.lines.data[0].pricing?.price_details?.price;
  const tier = Object.values(tiers).find((tier) => tier.priceId === priceId);
  if (!tier) {
    throw new Error(`Unknown price ID: ${priceId}. No matching tier found.`);
  }
  return tier.id;
}

function extractUserId(metadata: Stripe.Metadata | null): Promise<UserId> {
  if (!metadata || !metadata.userId) {
    return Promise.reject(new Error('No userId found in Stripe metadata'));
  }
  return Promise.resolve(metadata.userId as UserId);
}

function handleCustomerCreated(event: Stripe.CustomerCreatedEvent): Promise<void> {
  const customer = event.data.object;
  logger.info('Handling customer created', {
    customerId: customer.id,
    email: customer.email
  });
  return Promise.resolve();
}

function handleCustomerUpdated(event: Stripe.CustomerUpdatedEvent): Promise<void> {
  const customer = event.data.object;
  const previousAttributes = event.data.previous_attributes;
  logger.info('Handling customer updated', {
    customerId: customer.id,
    updatedFields: Object.keys(previousAttributes || {})
  });
  return Promise.resolve();
}

function handleCustomerDeleted(event: Stripe.CustomerDeletedEvent): Promise<void> {
  const customer = event.data.object;
  logger.info('Handling customer deleted', {
    customerId: customer.id
  });
  return Promise.resolve();
}

function handleSubscriptionCreated(event: Stripe.CustomerSubscriptionCreatedEvent): Promise<void> {
  const subscription = event.data.object;
  logger.info('Handling subscription created', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status
  });
  return Promise.resolve();
}

function handleSubscriptionUpdated(event: Stripe.CustomerSubscriptionUpdatedEvent): Promise<void> {
  const subscription = event.data.object;
  const previousAttributes = event.data.previous_attributes;
  logger.info('Handling subscription updated', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
    updatedFields: Object.keys(previousAttributes || {})
  });
  return Promise.resolve();
}

function handleSubscriptionDeleted(event: Stripe.CustomerSubscriptionDeletedEvent): Promise<void> {
  const subscription = event.data.object;
  logger.info('Handling subscription deleted', {
    subscriptionId: subscription.id,
    customerId: subscription.customer
  });
  return Promise.resolve();
}

function handleInvoiceCreated(event: Stripe.InvoiceCreatedEvent): Promise<void> {
  const invoice = event.data.object;
  logger.info('Handling invoice created', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_due
  });
  return Promise.resolve();
}

function handleInvoicePaymentSucceeded(
  event: Stripe.InvoicePaymentSucceededEvent,
  creditsService: CreditsService<IdpName>,
  tiers: Tiers
): Promise<void> {
  const invoice = event.data.object;
  logger.info('Handling invoice payment succeeded', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_paid,
    billingReason: invoice.billing_reason
  });
  const tierId = extractTier(invoice, tiers);
  return extractUserId(invoice.metadata).then((userId) => {
    if (invoice.billing_reason === 'subscription_create') {
      return creditsService.createSubscription(userId, tierId);
    } else if (invoice.billing_reason === 'subscription_cycle') {
      return creditsService.renewSubscription(userId, tierId);
    } else {
      logger.error('Unhandled billing reason for invoice payment succeeded', {
        invoiceId: invoice.id,
        billingReason: invoice.billing_reason
      });
    }
  });
}

function handleInvoicePaymentFailed(event: Stripe.InvoicePaymentFailedEvent): Promise<void> {
  const invoice = event.data.object;
  logger.info('Handling invoice payment failed', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_due
  });
  return Promise.resolve();
}

function handlePaymentIntentSucceeded(event: Stripe.PaymentIntentSucceededEvent): Promise<void> {
  const paymentIntent = event.data.object;
  logger.info('Handling payment intent succeeded', {
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    amount: paymentIntent.amount
  });
  return Promise.resolve();
}

function handlePaymentIntentFailed(event: Stripe.PaymentIntentPaymentFailedEvent): Promise<void> {
  const paymentIntent = event.data.object;
  logger.info('Handling payment intent failed', {
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    amount: paymentIntent.amount
  });
  return Promise.resolve();
}
