import type { Logger } from '@aws-lambda-powertools/logger';
import { extractIdentity } from '@model/UserIdentity';
import type { Identity, IdpName, StripeCustomerId } from '@notifycal/shared/types';
import type { PaymentUserIndexStore } from '@services/stores/user-payment-index-store';
import type { Stripe } from 'stripe';
import { match, P } from 'ts-pattern';

export interface IdentityExtractor<T extends Stripe.Event = Stripe.Event> {
  extract(event: T): Promise<Identity<IdpName>>;
}

export class StripeIdentityExtractor implements IdentityExtractor<Stripe.Event> {
  public constructor(
    private readonly userPaymentIndexStore: PaymentUserIndexStore<IdpName>,
    private readonly logger: Logger
  ) {}
  public extract(event: Stripe.Event): Promise<Identity<IdpName>> {
    const stripeCustomerId = this.getStripeCustomerId(event);

    if (!stripeCustomerId) {
      return Promise.reject(
        new Error(`No customer id found in Stripe event of type ${event.type}`)
      );
    }

    return this.userPaymentIndexStore.getIdentityByStripeCustomerId(stripeCustomerId).then(
      (paymentUser) => {
        if (paymentUser) {
          return extractIdentity(paymentUser);
        } else {
          return Promise.reject(
            new Error(
              `No customer found in our persistence with id ${stripeCustomerId}. Result ${paymentUser}`
            )
          );
        }
      },
      (error) => {
        return Promise.reject(
          new Error(`No customer found in our persistence with id ${stripeCustomerId}`, {
            cause: error
          })
        );
      }
    );
  }

  private getStripeCustomerId(event: Stripe.Event): StripeCustomerId | null {
    return match(event)
      .with({ type: 'checkout.session.completed' }, (e) =>
        this.extractCustomerId(e.data.object.customer)
      )
      .with(
        { type: 'customer.created' },
        { type: 'customer.updated' },
        { type: 'customer.deleted' },
        (e) => this.extractCustomerId(e.data.object.id)
      )
      .with(
        { type: 'customer.subscription.created' },
        { type: 'customer.subscription.updated' },
        { type: 'customer.subscription.deleted' },
        { type: 'customer.subscription.paused' },
        { type: 'customer.subscription.resumed' },
        (e) => this.extractCustomerId(e.data.object.customer)
      )
      .with(
        { type: 'invoice.created' },
        { type: 'invoice.payment_succeeded' },
        { type: 'invoice.payment_failed' },
        (e) => this.extractCustomerId(e.data.object.customer)
      )
      .with({ type: 'payment_intent.succeeded' }, { type: 'payment_intent.payment_failed' }, (e) =>
        this.extractCustomerId(e.data.object.customer)
      )
      .otherwise(() => {
        this.logger.error(`No customer id extractor from event of type ${event.type}`);
        return null;
      });
  }

  private extractCustomerId(
    v: string | Stripe.Customer | Stripe.DeletedCustomer | null
  ): StripeCustomerId | null {
    return match(v)
      .with(P.nullish, () => null)
      .with(P.string, (v) => v as StripeCustomerId)
      .with({ object: 'customer' }, (v) => v.id as StripeCustomerId)
      .exhaustive();
  }
}
