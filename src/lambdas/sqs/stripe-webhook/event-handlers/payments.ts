import type { Logger } from '@aws-lambda-powertools/logger';
import type { Identity, IdpName } from '@notifycal/shared/types';
import type { Stripe } from 'stripe';
import type { EventHandler } from './common';

export class PaymentIntentSucceededHandler
  implements EventHandler<Stripe.PaymentIntentSucceededEvent>
{
  public constructor(private readonly logger: Logger) {}

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
  implements EventHandler<Stripe.PaymentIntentPaymentFailedEvent>
{
  public constructor(private readonly logger: Logger) {}

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
