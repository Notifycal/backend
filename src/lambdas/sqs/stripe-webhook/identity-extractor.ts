import { identitySchema } from '@model/Jwt';
import type { Identity, IdpName } from '@notifycal/shared/types';
import type { Stripe } from 'stripe';
import { match } from 'ts-pattern';

export interface IdentityExtractor<T extends Stripe.Event = Stripe.Event> {
  extract(event: T): Promise<Identity<IdpName>>;
}

export class StripeIdentityExtractor implements IdentityExtractor<Stripe.Event> {
  public extract(event: Stripe.Event): Promise<Identity<IdpName>> {
    const metadata = this.getMetadataFromEvent(event);
    if (!metadata) {
      return Promise.reject(new Error(`No metadata found in Stripe event of type ${event.type}`));
    }
    const { userId, idp, idpId, email } = metadata;
    const identityFields = { userId, idp, idpId, email };
    const result = identitySchema.safeParse(identityFields);
    if (!result.success) {
      return Promise.reject(
        new Error(`No identity data found in Stripe metadata for event ${event.type}`, {
          cause: result.error
        })
      );
    }
    return Promise.resolve(result.data as Identity<IdpName>);
  }

  private getMetadataFromEvent(event: Stripe.Event): Stripe.Metadata | null {
    return match(event)
      .with(
        { type: 'customer.created' },
        { type: 'customer.updated' },
        { type: 'customer.deleted' },
        (e) => e.data.object.metadata
      )
      .with(
        { type: 'customer.subscription.created' },
        { type: 'customer.subscription.updated' },
        { type: 'customer.subscription.deleted' },
        (e) => e.data.object.metadata
      )
      .with(
        { type: 'invoice.created' },
        { type: 'invoice.payment_succeeded' },
        { type: 'invoice.payment_failed' },
        (e) => e.data.object.metadata
      )
      .with(
        { type: 'payment_intent.succeeded' },
        { type: 'payment_intent.payment_failed' },
        (e) => e.data.object.metadata
      )
      .otherwise(() => null);
  }
}
