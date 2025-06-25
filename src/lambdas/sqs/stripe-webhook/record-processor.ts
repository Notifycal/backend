import type { Logger } from '@aws-lambda-powertools/logger';
import type { TierId, Tiers } from '@model/PaymentPlans';
import type { IdpName } from '@notifycal/shared/types';
import { CreditsService } from '@services/credits-service';
import { SnsService } from '@services/sns';
import { PaymentUserIndexStore } from '@services/stores/payment-user-index-store';
import { UserBaseStore } from '@services/stores/user-base-store';
import type { EventBridgeEvent } from 'aws-lambda';
import type { Stripe } from 'stripe';
import { SubscriptionService } from '../../../services/subscription-service';
import type { StripeWebhookConfig } from './config';
import { CheckoutSessionCompletedHandler } from './event-handlers/checkout';
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
  SubscriptionPausedHandler,
  SubscriptionResumedHandler,
  SubscriptionUpdatedHandler
} from './event-handlers/subscription';
import { StripeEventPublisher } from './event-publisher';
import { StripeIdentityExtractor } from './identity-extractor';
import { StripeEventProcessor } from './stripe-event-processor';
import type { StripeEventType } from './stripe-schemas';

export function defaultEventHandlers(
  subscriptionService: SubscriptionService<IdpName>,
  tiers: Tiers,
  logger: Logger
): Map<StripeEventType, EventHandler<Stripe.Event>> {
  return new Map<StripeEventType, EventHandler<Stripe.Event>>([
    ['checkout.session.completed', new CheckoutSessionCompletedHandler(logger)],
    ['customer.created', new CustomerCreatedHandler(logger)],
    ['customer.updated', new CustomerUpdatedHandler(logger)],
    ['customer.deleted', new CustomerDeletedHandler(logger)],
    ['customer.subscription.created', new SubscriptionCreatedHandler(logger)],
    ['customer.subscription.updated', new SubscriptionUpdatedHandler(logger)],
    ['customer.subscription.deleted', new SubscriptionDeletedHandler(logger)],
    ['customer.subscription.paused', new SubscriptionPausedHandler(logger)],
    ['customer.subscription.resumed', new SubscriptionResumedHandler(logger)],
    ['invoice.created', new InvoiceCreatedHandler(logger)],
    [
      'invoice.payment_succeeded',
      new InvoicePaymentSucceededHandler(logger, subscriptionService, tiers)
    ],
    ['invoice.payment_failed', new InvoicePaymentFailedHandler(logger)],
    ['payment_intent.succeeded', new PaymentIntentSucceededHandler(logger)],
    ['payment_intent.payment_failed', new PaymentIntentFailedHandler(logger)]
  ]);
}

export function recordProcessor(
  record: EventBridgeEvent<StripeEventType, Stripe.Event>,
  eventHandlerFactory: (
    subscriptionService: SubscriptionService<IdpName>,
    tiers: Tiers,
    logger: Logger
  ) => Map<StripeEventType, EventHandler<Stripe.Event>> = defaultEventHandlers,
  config: StripeWebhookConfig,
  logger: Logger
): Promise<void> {
  const stripeEvent = record.detail;
  logger.info('Processing Stripe webhook event');
  const userStore = UserBaseStore.withConfig(config.userBaseStoreConfig);
  const userPaymentIndexStore = PaymentUserIndexStore.withConfig(
    config.paymentUserIndexStoreConfig
  );
  const creditsService = new CreditsService(userStore);
  const tierToCreditsMap = Object.fromEntries(
    Object.values(config.paymentPlans.tiers).map((value) => [value.id, value.credits])
  ) as Record<TierId, number>;
  const subscriptionService = new SubscriptionService(creditsService, tierToCreditsMap);
  const snsService = SnsService.withConfig(config.paymentWebhookTopicConfig);
  const ourHandlers = eventHandlerFactory(subscriptionService, config.paymentPlans.tiers, logger);
  const processor = new StripeEventProcessor(
    new StripeIdentityExtractor(userPaymentIndexStore, logger),
    ourHandlers,
    new StripeEventPublisher(snsService),
    logger,
    (event) => Promise.reject(new Error(`Unhandled event type: ${event.type}`))
  );

  return processor.process(stripeEvent);
}
