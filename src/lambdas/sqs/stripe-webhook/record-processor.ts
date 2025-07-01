/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { Logger } from '@aws-lambda-powertools/logger';
import type { TierId, TierMap, TopupId, TopupMap } from '@model/PaymentPlans';
import type { IdpName } from '@notifycal/shared/types';
import { CreditsService } from '@services/credits-service';
import { SnsService } from '@services/sns';
import { PaymentUserIndexStore } from '@services/stores/payment-user-index-store';
import { UserBaseStore } from '@services/stores/user-base-store';
import { SubscriptionService } from '@services/subscription';
import { TopupService } from '@services/topup';
import type { EventBridgeEvent } from 'aws-lambda';
import type { Stripe } from 'stripe';
import type { StripeWebhookConfig } from './config';
import { CheckoutSessionCompletedHandler } from './event-handlers/checkout';
import type { EventHandlerBuilder } from './event-handlers/common';
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
} from './event-handlers/payment-intent';
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
  topupService: TopupService<IdpName>,
  tiers: TierMap,
  topups: TopupMap,
  logger: Logger
): Map<StripeEventType, EventHandlerBuilder<Stripe.Event>> {
  return new Map<StripeEventType, EventHandlerBuilder<Stripe.Event>>([
    ['checkout.session.completed', (e) => new CheckoutSessionCompletedHandler(e, logger)],
    ['customer.created', (e) => new CustomerCreatedHandler(e, logger)],
    ['customer.updated', (e) => new CustomerUpdatedHandler(e, logger)],
    ['customer.deleted', (e) => new CustomerDeletedHandler(e, logger)],
    ['customer.subscription.created', (e) => new SubscriptionCreatedHandler(e, logger)],
    [
      'customer.subscription.updated',
      (e) => new SubscriptionUpdatedHandler(e, subscriptionService, logger)
    ],
    [
      'customer.subscription.deleted',
      (e) => new SubscriptionDeletedHandler(e, subscriptionService, logger)
    ],
    ['customer.subscription.paused', (e) => new SubscriptionPausedHandler(e, logger)],
    ['customer.subscription.resumed', (e) => new SubscriptionResumedHandler(e, logger)],
    ['invoice.created', (e) => new InvoiceCreatedHandler(e, logger)],
    [
      'invoice.payment_succeeded',
      (e) =>
        new InvoicePaymentSucceededHandler(
          e,
          tiers,
          topups,
          subscriptionService,
          topupService,
          logger
        )
    ],
    ['invoice.payment_failed', (e) => new InvoicePaymentFailedHandler(e, logger)],
    ['payment_intent.succeeded', (e) => new PaymentIntentSucceededHandler(e, logger)],
    ['payment_intent.payment_failed', (e) => new PaymentIntentFailedHandler(e, logger)]
  ]);
}

export function recordProcessor(
  record: EventBridgeEvent<StripeEventType, Stripe.Event>,
  eventHandlerFactory: (
    subscriptionService: SubscriptionService<IdpName>,
    topupService: TopupService<IdpName>,
    tiers: TierMap,
    topups: TopupMap,
    logger: Logger
  ) => Map<StripeEventType, EventHandlerBuilder<Stripe.Event>> = defaultEventHandlers,
  config: StripeWebhookConfig,
  logger: Logger
): Promise<void> {
  const stripeEvent = record.detail;
  logger.info('Processing Stripe webhook event');
  const userStore = UserBaseStore.withConfig(config.userBaseStoreConfig, logger);
  const userPaymentIndexStore = PaymentUserIndexStore.withConfig(
    config.paymentUserIndexStoreConfig
  );
  const creditsService = new CreditsService(userStore, logger);
  const { tiers, topups } = config.paymentPlans;
  const tierToCreditsMap = Object.fromEntries(
    Object.values(tiers).map((value) => [value.id, value.credits])
  ) as Record<TierId, number>;
  const topupToCreditsMap = Object.fromEntries(
    Object.values(topups).map((value) => [value.id, value.credits])
  ) as Record<TopupId, number>;
  const subscriptionService = new SubscriptionService(creditsService, tierToCreditsMap);
  const topupService = new TopupService(creditsService, topupToCreditsMap);
  const snsService = SnsService.withConfig(config.paymentWebhookTopicConfig, logger);
  const ourHandlers = eventHandlerFactory(subscriptionService, topupService, tiers, topups, logger);
  const processor = new StripeEventProcessor(
    new StripeIdentityExtractor(userPaymentIndexStore, logger),
    ourHandlers,
    new StripeEventPublisher(snsService),
    logger,
    (event) => Promise.reject(new Error(`Unhandled event type: ${event.type}`))
  );

  return processor.process(stripeEvent);
}
