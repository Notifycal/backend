import type { Logger } from '@aws-lambda-powertools/logger';
import type { Identity, IdpName } from '@notifycal/shared/types';
import type { Stripe } from 'stripe';
import type { StripeEventType } from '../stripe-schemas';
import { BaseHandler } from './base-handler';
import type { EventHandler } from './common';

export class PaymentIntentSucceededHandler
  extends BaseHandler
  implements EventHandler<Stripe.PaymentIntentSucceededEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.PaymentIntentSucceededEvent,
    identity: Identity<IdpName>
  ): Promise<void> {
    const paymentIntent = event.data.object;
    this.logger.info('Handling payment intent succeeded', {
      paymentIntentId: paymentIntent.id,
      customerId: paymentIntent.customer,
      amount: paymentIntent.amount,
      userId: identity.userId
    });
    return Promise.resolve();
  }
}

export class PaymentIntentFailedHandler
  extends BaseHandler
  implements EventHandler<Stripe.PaymentIntentPaymentFailedEvent>
{
  public constructor(
    stripeEventType: StripeEventType,
    private readonly logger: Logger
  ) {
    super(stripeEventType);
  }

  public handle(
    event: Stripe.PaymentIntentPaymentFailedEvent,
    identity: Identity<IdpName>
  ): Promise<void> {
    const paymentIntent = event.data.object;
    this.logger.info('Handling payment intent failed', {
      paymentIntentId: paymentIntent.id,
      customerId: paymentIntent.customer,
      amount: paymentIntent.amount,
      userId: identity.userId
    });
    return Promise.resolve();
  }
}
