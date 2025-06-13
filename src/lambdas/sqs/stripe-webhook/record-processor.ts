import type { Logger } from '@aws-lambda-powertools/logger';
import type { Tiers } from '@model/PaymentPlans';
import type { IdpName } from '@notifycal/shared/types';
import { SnsService } from '@services/sns';
import { UserBaseStore } from '@services/stores/user-base-store';
import type { Stripe } from 'stripe';
import type { StripeWebhookConfig } from './config';
import { CreditsService } from './credit-service';
import type { EventHandler } from './event-handlers/common';
import {
  CustomerCreatedHandler,
  CustomerDeletedHandler,
  CustomerUpdatedHandler
} from './event-handlers/customer';
import {
  InvoiceCreatedHandler,
  InvoicePaymentFailedHandler,
  InvoicePaymentSucceededHandler
} from './event-handlers/invoice';
import {
  PaymentIntentFailedHandler,
  PaymentIntentSucceededHandler
} from './event-handlers/payments';
import {
  SubscriptionCreatedHandler,
  SubscriptionDeletedHandler,
  SubscriptionUpdatedHandler
} from './event-handlers/subscription';
import { GenericEventProcessor, createStripeEventPublisher } from './generic-event-processor';
import { StripeIdentityExtractor } from './identity-extractor';
import type { Record } from './schema';
import type { StripeEventType } from './stripe-schemas';

export function createEventHandlers(
  logger: Logger,
  creditsService: CreditsService<IdpName>,
  tiers: Tiers
): Map<StripeEventType, EventHandler<Stripe.Event>> {
  return new Map<StripeEventType, EventHandler<Stripe.Event>>([
    ['customer.created', new CustomerCreatedHandler(logger)],
    ['customer.updated', new CustomerUpdatedHandler(logger)],
    ['customer.deleted', new CustomerDeletedHandler(logger)],
    ['customer.subscription.created', new SubscriptionCreatedHandler(logger)],
    ['customer.subscription.updated', new SubscriptionUpdatedHandler(logger)],
    ['customer.subscription.deleted', new SubscriptionDeletedHandler(logger)],
    ['invoice.created', new InvoiceCreatedHandler(logger)],
    [
      'invoice.payment_succeeded',
      new InvoicePaymentSucceededHandler(logger, creditsService, tiers)
    ],
    ['invoice.payment_failed', new InvoicePaymentFailedHandler(logger)],
    ['payment_intent.succeeded', new PaymentIntentSucceededHandler(logger)],
    ['payment_intent.payment_failed', new PaymentIntentFailedHandler(logger)]
  ]);
}

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
  const identityExtractor = new StripeIdentityExtractor();
  const eventPublisher = createStripeEventPublisher(snsService);
  const handlers = createEventHandlers(logger, creditsService, config.paymentPlans.tiers);
  const processor = new GenericEventProcessor<Stripe.Event>(
    identityExtractor,
    handlers,
    eventPublisher,
    logger,
    (event) => Promise.reject(new Error(`Unhandled event type: ${event.type}`))
  );

  return processor.process(stripeEvent);
}
