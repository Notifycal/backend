import type { Logger } from '@aws-lambda-powertools/logger';
import { throwError } from '@services/common/error-handling';
import { tap } from '@utils/promises';
import type { Stripe } from 'stripe';
import type { EventHandler } from './event-handlers/common';
import type { EventPublisher } from './event-publisher';
import type { IdentityExtractor } from './identity-extractor';
import type { StripeEventType } from './stripe-schemas';

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
      .then(
        tap((identity) => {
          this.logger.appendKeys({
            ...identity
          });
        })
      )
      .then((identity) =>
        handler
          .handle(event, identity)
          .then(
            tap(() => {
              this.logger.info('Successfully processed event', {
                eventType: event.type
              });
            })
          )
          .then(() => this.eventPublisher.publish(event, identity))
      )
      .catch((error) => {
        throwError('Error processing event', error, {
          eventType: event.type
        });
      });
  }
}
