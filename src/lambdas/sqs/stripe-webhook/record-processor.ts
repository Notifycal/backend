/* eslint-disable no-use-before-define */
import type { Logger } from '@aws-lambda-powertools/logger';
import { toNotifycalEvent } from '@model/app-events/StripeWebhookEventFiredEvent';
import type { TierId, Tiers } from '@model/PaymentPlans';
import type { Email, Identity, IdpId, IdpName, UserId } from '@notifycal/shared/types';
import { throwError } from '@services/common/error-handling';
import { SnsService } from '@services/sns';
import { UserBaseStore } from '@services/stores/user-base-store';
import { tap } from '@utils/promises';
import type { Stripe } from 'stripe';
import { match } from 'ts-pattern';
import type { StripeWebhookConfig } from './config';
import { CreditsService } from './credit-service';
import type { Record } from './schema';

export function recordProcessor(
  record: Record,
  config: StripeWebhookConfig,
  logger: Logger
): Promise<void> {
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
  const snsService = SnsService.withConfig(config.paymentWebhookTopicConfig);

  return match(stripeEvent)
    .with({ type: 'customer.created' }, (event) => handleCustomerCreated(event, logger))
    .with({ type: 'customer.updated' }, (event) => handleCustomerUpdated(event, logger))
    .with({ type: 'customer.deleted' }, (event) => handleCustomerDeleted(event, logger))
    .with({ type: 'customer.subscription.created' }, (event) =>
      handleSubscriptionCreated(event, logger)
    )
    .with({ type: 'customer.subscription.updated' }, (event) =>
      handleSubscriptionUpdated(event, logger)
    )
    .with({ type: 'customer.subscription.deleted' }, (event) =>
      handleSubscriptionDeleted(event, logger)
    )
    .with({ type: 'invoice.created' }, (event) => handleInvoiceCreated(event, logger))
    .with({ type: 'invoice.payment_succeeded' }, (event) =>
      extractIdentity(event.data.object.metadata).then((identity) =>
        handleInvoicePaymentSucceeded(
          event,
          identity,
          creditsService,
          config.paymentPlans.tiers,
          logger
        ).then(() => identity)
      )
    )
    .with({ type: 'invoice.payment_failed' }, (event) => handleInvoicePaymentFailed(event, logger))
    .with({ type: 'payment_intent.succeeded' }, (event) =>
      handlePaymentIntentSucceeded(event, logger)
    )
    .with({ type: 'payment_intent.payment_failed' }, (event) =>
      handlePaymentIntentFailed(event, logger)
    )
    .otherwise((event) => {
      logger.error('Unhandled Stripe event type. Not retrying cause it will not fix anything', {
        eventType: event.type,
        eventId: event.id
      });
      return Promise.resolve();
    })
    .then(
      tap((identity) => {
        logger.info('Successfully processed Stripe webhook event', {
          eventId: stripeEvent.id,
          eventType: stripeEvent.type
        });
        return _publishEventToSns(stripeEvent, identity, snsService);
      })
    )
    .then();
}

function _publishEventToSns<TStripeEvent extends Stripe.Event>(
  event: TStripeEvent,
  identity: Identity<IdpName>,
  snsService: SnsService
): Promise<void> {
  const ourEvent = toNotifycalEvent(event, identity.userId, identity.idp, identity.idpId);
  return snsService.publish(ourEvent).then();
}

function extractTier(invoice: Stripe.Invoice, tiers: Tiers): TierId {
  const priceId = invoice.lines.data[0].pricing?.price_details?.price;
  const tier = Object.values(tiers).find((tier) => tier.priceId === priceId);
  if (!tier) {
    throw new Error(`Unknown price ID: ${priceId}. No matching tier found.`);
  }
  return tier.id;
}

function extractIdentity(metadata: Stripe.Metadata | null): Promise<Identity<IdpName>> {
  if (!metadata) {
    return Promise.reject(new Error('No metadata found in Stripe event'));
  }
  const { userId, idp, idpId, email } = metadata;
  const requiredFields = { userId, idp, idpId, email };
  for (const [key, value] of Object.entries(requiredFields)) {
    if (!value) {
      return Promise.reject(new Error(`No ${key} found in Stripe metadata`));
    }
  }
  return Promise.resolve({
    userId: userId as UserId,
    idp: idp as IdpName,
    idpId: idpId as IdpId,
    email: email as Email
  });
}

function handleCustomerCreated(event: Stripe.CustomerCreatedEvent, logger: Logger): Promise<void> {
  const customer = event.data.object;
  logger.info('Handling customer created', {
    customerId: customer.id,
    email: customer.email
  });
  return Promise.resolve();
}

function handleCustomerUpdated(event: Stripe.CustomerUpdatedEvent, logger: Logger): Promise<void> {
  const customer = event.data.object;
  const previousAttributes = event.data.previous_attributes;
  logger.info('Handling customer updated', {
    customerId: customer.id,
    updatedFields: Object.keys(previousAttributes || {})
  });
  return Promise.resolve();
}

function handleCustomerDeleted(event: Stripe.CustomerDeletedEvent, logger: Logger): Promise<void> {
  const customer = event.data.object;
  logger.info('Handling customer deleted', {
    customerId: customer.id
  });
  return Promise.resolve();
}

function handleSubscriptionCreated(
  event: Stripe.CustomerSubscriptionCreatedEvent,
  logger: Logger
): Promise<void> {
  const subscription = event.data.object;
  logger.info('Handling subscription created', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status
  });
  return Promise.resolve();
}

function handleSubscriptionUpdated(
  event: Stripe.CustomerSubscriptionUpdatedEvent,
  logger: Logger
): Promise<void> {
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

function handleSubscriptionDeleted(
  event: Stripe.CustomerSubscriptionDeletedEvent,
  logger: Logger
): Promise<void> {
  const subscription = event.data.object;
  logger.info('Handling subscription deleted', {
    subscriptionId: subscription.id,
    customerId: subscription.customer
  });
  return Promise.resolve();
}

function handleInvoiceCreated(event: Stripe.InvoiceCreatedEvent, logger: Logger): Promise<void> {
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
  identity: Identity<IdpName>,
  creditsService: CreditsService<IdpName>,
  tiers: Tiers,
  logger: Logger
): Promise<void> {
  const invoice = event.data.object;
  logger.info('Handling invoice payment succeeded', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_paid,
    billingReason: invoice.billing_reason
  });
  const tierId = extractTier(invoice, tiers);
  if (invoice.billing_reason === 'subscription_create') {
    return creditsService.createSubscription(identity.userId, tierId);
  } else if (invoice.billing_reason === 'subscription_cycle') {
    return creditsService.renewSubscription(identity.userId, tierId);
  } else {
    logger.error('Unhandled billing reason for invoice payment succeeded', {
      invoiceId: invoice.id,
      billingReason: invoice.billing_reason
    });
    throwError('TODO');
  }
}

function handleInvoicePaymentFailed(
  event: Stripe.InvoicePaymentFailedEvent,
  logger: Logger
): Promise<void> {
  const invoice = event.data.object;
  logger.info('Handling invoice payment failed', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_due
  });
  return Promise.resolve();
}

function handlePaymentIntentSucceeded(
  event: Stripe.PaymentIntentSucceededEvent,
  logger: Logger
): Promise<void> {
  const paymentIntent = event.data.object;
  logger.info('Handling payment intent succeeded', {
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    amount: paymentIntent.amount
  });
  return Promise.resolve();
}

function handlePaymentIntentFailed(
  event: Stripe.PaymentIntentPaymentFailedEvent,
  logger: Logger
): Promise<void> {
  const paymentIntent = event.data.object;
  logger.info('Handling payment intent failed', {
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    amount: paymentIntent.amount
  });
  return Promise.resolve();
}
