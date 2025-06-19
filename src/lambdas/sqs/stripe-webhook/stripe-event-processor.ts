import type { Logger } from '@aws-lambda-powertools/logger';
import { throwError } from '@services/common/error-handling';
import { tap } from '@utils/promises';
import type { Stripe } from 'stripe';
import type { EventHandler } from './event-handlers/common';
import type { EventPublisher } from './event-publisher';
import type { IdentityExtractor } from './identity-extractor';
import type { StripeEventType } from './stripe-schemas';

export class StripeEventProcessor {
  public constructor(
    private readonly identityExtractor: IdentityExtractor<Stripe.Event>,
    private readonly eventHandlers: Map<StripeEventType, EventHandler<Stripe.Event>>,
    private readonly eventPublisher: EventPublisher<Stripe.Event>,
    private readonly logger: Logger,
    private readonly onUnhandledEvent: (event: Stripe.Event) => Promise<void>
  ) {}

  public process(event: Stripe.Event): Promise<void> {
    this.logger.appendKeys({
      eventType: event.type
    });
    const handler = this.eventHandlers.get(event.type);
    if (!handler) {
      this.logger.error(
        'Unhandled event type. This means the integration on Stripe side is configured to send event types for which there is no event handlers in code'
      );
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
              this.logger.info('Successfully processed event');
            })
          )
          .then(() =>
            this.eventPublisher.publish(event, identity).catch((error) => {
              this.logger.error(
                `There was an error publishing an Stripe event after having processed it`,
                { cause: error, event }
              );
            })
          )
      )
      .catch((error) => {
        throwError('Error processing event', error);
      });
  }
}
