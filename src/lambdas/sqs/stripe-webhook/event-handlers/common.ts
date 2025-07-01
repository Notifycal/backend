import type { Identity, IdpName } from '@notifycal/shared/types';
import type Stripe from 'stripe';
import type { StripeEventType } from '../stripe-schemas';

export type EventHandlerBuilder<T extends Stripe.Event = Stripe.Event> = (
  type: StripeEventType
) => EventHandler<T>;
export interface EventHandler<T extends Stripe.Event = Stripe.Event> {
  handle(event: T, identity: Identity<IdpName>): Promise<void>;
}