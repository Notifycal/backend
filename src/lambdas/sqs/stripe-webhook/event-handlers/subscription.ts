import type { Logger } from '@aws-lambda-powertools/logger';
import type { Identity, IdpName } from '@notifycal/shared/types';
import type { SubscriptionService } from '@services/subscription';
import type Stripe from 'stripe';
import type { StripeEventType } from '../stripe-schemas';
import { BaseHandler } from './base-handler';
import type { EventHandler } from './common';

export class SubscriptionCreatedHandler
  extends BaseHandler
  implements EventHandler<Stripe.CustomerSubscriptionCreatedEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.CustomerSubscriptionCreatedEvent,
    identity: Identity<IdpName>
  ): Promise<void> {
    const subscription = event.data.object;
    this.logger.info('Handling subscription created', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      userId: identity.userId
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
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.CustomerSubscriptionUpdatedEvent,
    identity: Identity<IdpName>
  ): Promise<void> {
    const subscription = event.data.object;
    const previousAttributes = event.data.previous_attributes;
    this.logger.info('Handling subscription updated', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      updatedFields: Object.keys(previousAttributes || {}),
      userId: identity.userId
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
        .cancel(identity.userId, 'unpaid')
        .then(() => {}, this.handleError('subscription-unpaid'));
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
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.CustomerSubscriptionDeletedEvent,
    identity: Identity<IdpName>
  ): Promise<void> {
    const subscription = event.data.object;
    this.logger.info('Handling subscription deleted', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      userId: identity.userId
    });
    return this.subscriptionService
      .cancel(identity.userId, 'cancelled')
      .then(() => {}, this.handleError('subscription-cancelled'));
  }
}

export class SubscriptionPausedHandler
  extends BaseHandler
  implements EventHandler<Stripe.CustomerSubscriptionPausedEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.CustomerSubscriptionPausedEvent,
    identity: Identity<IdpName>
  ): Promise<void> {
    const subscription = event.data.object;
    this.logger.info('Handling subscription paused', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      userId: identity.userId
    });
    return Promise.resolve();
  }
}

export class SubscriptionResumedHandler
  extends BaseHandler
  implements EventHandler<Stripe.CustomerSubscriptionResumedEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.CustomerSubscriptionResumedEvent,
    identity: Identity<IdpName>
  ): Promise<void> {
    const subscription = event.data.object;
    this.logger.info('Handling subscription resumed', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      userId: identity.userId
    });
    return Promise.resolve();
  }
}
