import type { Logger } from '@aws-lambda-powertools/logger';
import type { IdpName, UserIdentity } from '@notifycal/shared/types';
import type { Stripe } from 'stripe';
import type { StripeEventType } from '../stripe-schemas';
import { BaseHandler } from './base-handler';
import type { EventHandler } from './common';

export class CheckoutSessionCompletedHandler
  extends BaseHandler
  implements EventHandler<Stripe.CheckoutSessionCompletedEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.CheckoutSessionCompletedEvent,
    userIdentity: UserIdentity<IdpName>
  ): Promise<void> {
    const session = event.data.object;
    this.logger.info('Handling checkout session completed', {
      checkoutSessionId: session.id,
      customerId: session.customer,
      userId: userIdentity.userId
    });
    return Promise.resolve();
  }
}
