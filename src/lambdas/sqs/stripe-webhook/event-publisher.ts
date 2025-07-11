import { fromStripeEvent } from '@model/app-events/StripeWebhookEventFiredEvent';
import type { IdpName, UserIdentity } from '@notifycal/shared/types';
import type { SnsService } from '@services/sns';
import type Stripe from 'stripe';

export interface EventPublisher<T> {
  publish(event: T, identity: UserIdentity<IdpName>): Promise<void>;
}

export class StripeEventPublisher implements EventPublisher<Stripe.Event> {
  public constructor(private readonly snsService: SnsService) {}

  public async publish(event: Stripe.Event, identity: UserIdentity<IdpName>): Promise<void> {
    const notifycalEvent = fromStripeEvent(event, identity);
    await this.snsService.safePublish(notifycalEvent);
  }
}
