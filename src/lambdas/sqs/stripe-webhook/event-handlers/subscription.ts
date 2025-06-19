import type { Logger } from '@aws-lambda-powertools/logger';
import type { Identity, IdpName } from '@notifycal/shared/types';
import type Stripe from 'stripe';
import type { EventHandler } from './common';

export class SubscriptionCreatedHandler
  implements EventHandler<Stripe.CustomerSubscriptionCreatedEvent>
{
  public constructor(private readonly logger: Logger) {}

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
  implements EventHandler<Stripe.CustomerSubscriptionUpdatedEvent>
{
  public constructor(private readonly logger: Logger) {}

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
    return Promise.resolve();
  }
}

export class SubscriptionDeletedHandler
  implements EventHandler<Stripe.CustomerSubscriptionDeletedEvent>
{
  public constructor(private readonly logger: Logger) {}

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
    return Promise.resolve();
  }
}
