/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { Logger } from '@aws-lambda-powertools/logger';
import type { TierMap, TopupMap } from '@model/PaymentPlans';
import type { IdpName, TierId, TopupId } from '@notifycal/shared/types';
import { CreditsService } from '@services/credits-service';
import { SnsService } from '@services/sns';
import { PaymentUserIndexStore } from '@services/stores/payment-user-index-store';
import { UserBaseStore } from '@services/stores/user-base-store';
import { SubscriptionService } from '@services/subscription';
import { TopupService } from '@services/topup';
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
import type { Record as SqsRecord } from './schema';
import { StripeEventProcessor } from './stripe-event-processor';
import type { StripeEventType } from './stripe-schemas';
import { StripeUserIdentityExtractor } from './user-identity-extractor';

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

function toProductToCreditsMap<T extends TierId | TopupId>(
  items: Record<string, { id: T; credits: number }>
): Record<T, number> {
  return Object.fromEntries(Object.values(items).map((item) => [item.id, item.credits])) as Record<
    T,
    number
  >;
}

export function recordProcessor(
  record: SqsRecord['body'],
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
  const snsService = SnsService.withConfig(config.paymentWebhookTopicConfig, logger);
  const subscriptionService = new SubscriptionService(
    creditsService,
    toProductToCreditsMap(tiers),
    snsService
  );
  const topupService = new TopupService(creditsService, toProductToCreditsMap(topups), snsService);
  const ourHandlers = eventHandlerFactory(subscriptionService, topupService, tiers, topups, logger);
  const processor = new StripeEventProcessor(
    new StripeUserIdentityExtractor(userPaymentIndexStore, logger),
    ourHandlers,
    new StripeEventPublisher(snsService),
    logger,
    (event) => Promise.reject(new Error(`Unhandled event type: ${event.type}`))
  );

  return processor.process(stripeEvent);
}
