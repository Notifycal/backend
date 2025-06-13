import { toNotifycalEvent } from '@model/app-events/StripeWebhookEventFiredEvent';
import type { Identity, IdpName } from '@notifycal/shared/types';
import type { SnsService } from '@services/sns';
import type Stripe from 'stripe';

export interface EventPublisher<T> {
  publish(event: T, identity: Identity<IdpName>): Promise<void>;
}

export class StripeEventPublisher implements EventPublisher<Stripe.Event> {
  public constructor(private readonly snsService: SnsService) {}

  public async publish(event: Stripe.Event, identity: Identity<IdpName>): Promise<void> {
    const notifycalEvent = toNotifycalEvent(event, identity.userId, identity.idp, identity.idpId);
    await this.snsService.publish(notifycalEvent);
  }
}
