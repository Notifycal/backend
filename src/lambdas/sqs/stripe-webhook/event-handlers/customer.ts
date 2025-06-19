import type { Logger } from '@aws-lambda-powertools/logger';
import type { Identity, IdpName, StripeCustomerId } from '@notifycal/shared/types';
import type { UserBaseStore } from '@services/stores/user-base-store';
import type Stripe from 'stripe';
import type { EventHandler } from './common';

export class CustomerCreatedHandler implements EventHandler<Stripe.CustomerCreatedEvent> {
  public constructor(
    private readonly userBaseStore: UserBaseStore<IdpName>,
    private readonly logger: Logger
  ) {}

  public handle(event: Stripe.CustomerCreatedEvent, identity: Identity<IdpName>): Promise<void> {
    const customer = event.data.object;
    this.logger.info('Handling customer created', {
      customerId: customer.id,
      email: customer.email,
      userId: identity.userId
    });
    return this.userBaseStore
      .updateStripeCustomerId(identity.userId, customer.id as StripeCustomerId)
      .then();
  }
}

export class CustomerUpdatedHandler implements EventHandler<Stripe.CustomerUpdatedEvent> {
  public constructor(private readonly logger: Logger) {}

  public handle(event: Stripe.CustomerUpdatedEvent, identity: Identity<IdpName>): Promise<void> {
    const customer = event.data.object;
    const previousAttributes = event.data.previous_attributes;
    this.logger.info('Handling customer updated', {
      customerId: customer.id,
      updatedFields: Object.keys(previousAttributes || {}),
      userId: identity.userId
    });
    return Promise.resolve();
  }
}

export class CustomerDeletedHandler implements EventHandler<Stripe.CustomerDeletedEvent> {
  public constructor(private readonly logger: Logger) {}

  public handle(event: Stripe.CustomerDeletedEvent, identity: Identity<IdpName>): Promise<void> {
    const customer = event.data.object;
    this.logger.info('Handling customer deleted', {
      customerId: customer.id,
      userId: identity.userId
    });
    return Promise.resolve();
  }
}
