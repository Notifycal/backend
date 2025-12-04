import type { Logger } from '@aws-lambda-powertools/logger';
import type { IdpName, UserIdentity } from '@notifycal/shared/types';
import type { StripeService } from '@services/stripe';
import type { SubscriptionService } from '@services/subscription';
import type Stripe from 'stripe';
import type { StripeEventType } from '../stripe-schemas';
import { BaseHandler } from './base-handler';
import type { EventHandler } from './common';

export class SubscriptionCreatedHandler
  extends BaseHandler
  implements EventHandler<Stripe.CustomerSubscriptionCreatedEvent>
{
  public constructor(stripeEventType: StripeEventType, logger: Logger) {
    super(stripeEventType, logger);
  }

  public handle(
    event: Stripe.CustomerSubscriptionCreatedEvent,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const subscription = event.data.object;
    this.logger.info('Handling subscription created', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      userId: userIdentity.userId
    });
    return Promise.resolve();
  }
}

export class SubscriptionUpdatedHandler
  extends BaseHandler
  implements EventHandler<Stripe.CustomerSubscriptionUpdatedEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly subscriptionService: SubscriptionService<IdpName>,
    private readonly stripeService: StripeService,
    logger: Logger
  ) {
    super(stripeEventType, logger);
  }

  public handle(
    event: Stripe.CustomerSubscriptionUpdatedEvent,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const subscription = event.data.object;
    const previousAttributes = event.data.previous_attributes;
    this.logger.info('Handling subscription updated', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      updatedFields: Object.keys(previousAttributes || {}),
      userId: userIdentity.userId
    });
    // Docs: https://docs.stripe.com/billing/subscriptions/overview#handle-recurring-charge-failures
    // Docs2: https://docs.stripe.com/billing/collection-method?locale=en-GB#failed-incomplete-subscriptions
    // Explanation: Notifycal desires to remove all the subscription credits as soon as we notice customer has not paid.
    // Because the collection_method = charge_automatically we expect the subscription status will go to past_due first. Nonetheless,
    // since the event handler is idempotent we defensively apply it on canceled and unpaid too.
    const subscriptionStatuses: Array<Stripe.Subscription.Status> = [
      'past_due',
      'canceled',
      'unpaid'
    ];
    if (subscriptionStatuses.includes(subscription.status)) {
      return this.subscriptionService
        .cancel(userIdentity, 'unpaid')
        .then(() => {}, this.handleError('subscription-unpaid'));
    }
    if (subscription.status === 'trialing') {
      return this.handleTrialWithPaymentMethodAdded(subscription, previousAttributes, userIdentity);
    }
    return Promise.resolve();
  }

  private handleTrialWithPaymentMethodAdded(
    subscription: Stripe.Subscription,
    previousAttributes: Stripe.CustomerSubscriptionUpdatedEvent['data']['previous_attributes'],
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const hasPaymentMethod = subscription.default_payment_method !== null;
    const paymentMethodJustAdded =
      previousAttributes &&
      'default_payment_method' in previousAttributes &&
      previousAttributes.default_payment_method !== subscription.default_payment_method;

    if (hasPaymentMethod && paymentMethodJustAdded) {
      this.logger.info('Payment method added during trial, ending trial now', {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        previousPaymentMethod: previousAttributes.default_payment_method,
        currentPaymentMethod: subscription.default_payment_method,
        userId: userIdentity.userId
      });

      return this.stripeService
        .endTrialAndResetBillingCycle(subscription.id)
        .then((updatedSubscription) => {
          this.logger.info('Successfully ended trial and reset billing cycle', {
            subscriptionId: updatedSubscription.id,
            newStatus: updatedSubscription.status,
            billingCycleAnchor: updatedSubscription.billing_cycle_anchor,
            trialEnd: updatedSubscription.trial_end,
            userId: userIdentity.userId
          });
        }, this.handleError('end-trial-on-payment-method-added'));
    }
    return Promise.resolve();
  }
}

export class SubscriptionDeletedHandler
  extends BaseHandler
  implements EventHandler<Stripe.CustomerSubscriptionDeletedEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly subscriptionService: SubscriptionService<IdpName>,
    logger: Logger
  ) {
    super(stripeEventType, logger);
  }

  public handle(
    event: Stripe.CustomerSubscriptionDeletedEvent,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const subscription = event.data.object;
    this.logger.info('Handling subscription deleted', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      userId: userIdentity.userId
    });
    return this.subscriptionService
      .cancel(userIdentity, 'cancelled')
      .then(() => {}, this.handleError('subscription-cancelled'));
  }
}

export class SubscriptionPausedHandler
  extends BaseHandler
  implements EventHandler<Stripe.CustomerSubscriptionPausedEvent>
{
  public constructor(stripeEventType: StripeEventType, logger: Logger) {
    super(stripeEventType, logger);
  }

  public handle(
    event: Stripe.CustomerSubscriptionPausedEvent,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const subscription = event.data.object;
    this.logger.info('Handling subscription paused', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      userId: userIdentity.userId
    });
    return Promise.resolve();
  }
}

export class SubscriptionResumedHandler
  extends BaseHandler
  implements EventHandler<Stripe.CustomerSubscriptionResumedEvent>
{
  public constructor(stripeEventType: StripeEventType, logger: Logger) {
    super(stripeEventType, logger);
  }

  public handle(
    event: Stripe.CustomerSubscriptionResumedEvent,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const subscription = event.data.object;
    this.logger.info('Handling subscription resumed', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      userId: userIdentity.userId
    });
    return Promise.resolve();
  }
}
