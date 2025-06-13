import type { Logger } from '@aws-lambda-powertools/logger';
import { toNotifycalEvent } from '@model/app-events/StripeWebhookEventFiredEvent';
import type { Identity, IdpName } from '@notifycal/shared/types';
import { throwError } from '@services/common/error-handling';
import type { SnsService } from '@services/sns';
import { tap } from '@utils/promises';
import type { Stripe } from 'stripe';
import type { EventHandler } from './event-handlers/common';
import type { IdentityExtractor } from './identity-extractor';
import type { StripeEventType } from './stripe-schemas';

export type EventPublisher<T> = (event: T, identity: Identity<IdpName>) => Promise<void>;

export class GenericEventProcessor<T extends Stripe.Event = Stripe.Event> {
  public constructor(
    private readonly identityExtractor: IdentityExtractor<T>,
    private readonly eventHandlers: Map<StripeEventType, EventHandler<T>>,
    private readonly eventPublisher: EventPublisher<T>,
    private readonly logger: Logger,
    private readonly onUnhandledEvent: (event: T) => Promise<void>
  ) {}

  public process(event: T): Promise<void> {
    const handler = this.eventHandlers.get(event.type);

    if (!handler) {
      this.logger.error('Unhandled event type', { eventType: event.type });
      return this.onUnhandledEvent(event);
    }

    return this.identityExtractor
      .extract(event)
      .then((identity) =>
        handler
          .handle(event, identity)
          .then(
            tap(() => {
              this.logger.info('Successfully processed event', {
                eventType: event.type,
                userId: identity.userId
              });
            })
          )
          .then(() => this.eventPublisher(event, identity))
      )
      .catch((error) => {
        throwError('Error processing event', error, {
          eventType: event.type
        });
      });
  }
}

export function createStripeEventPublisher(snsService: SnsService): EventPublisher<Stripe.Event> {
  return (event: Stripe.Event, identity: Identity<IdpName>) => {
    const notifycalEvent = toNotifycalEvent(event, identity.userId, identity.idp, identity.idpId);
    return snsService.publish(notifycalEvent).then();
  };
}
