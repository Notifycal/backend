import type { Identity, IdpName } from '@notifycal/shared/types';
import type Stripe from 'stripe';

export interface EventHandler<T extends Stripe.Event = Stripe.Event> {
  handle(event: T, identity: Identity<IdpName>): Promise<void>;
}
