import type { Logger } from '@aws-lambda-powertools/logger';
import type { IdpName, UserIdentity } from '@notifycal/shared/types';
import type Stripe from 'stripe';
import type { StripeEventType } from '../stripe-schemas';
import { BaseHandler } from './base-handler';
import type { EventHandler } from './common';

export class CustomerCreatedHandler
  extends BaseHandler
  implements EventHandler<Stripe.CustomerCreatedEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.CustomerCreatedEvent,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const customer = event.data.object;
    this.logger.info('Handling customer created', {
      customerId: customer.id,
      email: customer.email,
      userId: userIdentity.userId
    });
    return Promise.resolve();
  }
}

export class CustomerUpdatedHandler
  extends BaseHandler
  implements EventHandler<Stripe.CustomerUpdatedEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.CustomerUpdatedEvent,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const customer = event.data.object;
    const previousAttributes = event.data.previous_attributes;
    this.logger.info('Handling customer updated', {
      customerId: customer.id,
      updatedFields: Object.keys(previousAttributes || {}),
      userId: userIdentity.userId
    });
    return Promise.resolve();
  }
}

export class CustomerDeletedHandler
  extends BaseHandler
  implements EventHandler<Stripe.CustomerDeletedEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.CustomerDeletedEvent,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const customer = event.data.object;
    this.logger.info('Handling customer deleted', {
      customerId: customer.id,
      userId: userIdentity.userId
    });
    return Promise.resolve();
  }
}
