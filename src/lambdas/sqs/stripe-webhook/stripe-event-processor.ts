import type { Logger } from '@aws-lambda-powertools/logger';
import { rethrowError } from '@services/common/error-handling';
import { tap } from '@utils/promises';
import type { Stripe } from 'stripe';
import type { EventHandler } from './event-handlers/common';
import type { EventPublisher } from './event-publisher';
import type { IdentityExtractor } from './identity-extractor';
import type { StripeEventType } from './stripe-schemas';

export class StripeEventProcessor {
  public constructor(
    private readonly identityExtractor: IdentityExtractor<Stripe.Event>,
    private readonly eventHandlers: Map<
      StripeEventType,
      (type: StripeEventType) => EventHandler<Stripe.Event>
    >,
    private readonly eventPublisher: EventPublisher<Stripe.Event>,
    private readonly logger: Logger,
    private readonly onUnhandledEvent: (event: Stripe.Event) => Promise<void>
  ) {}

  public process(event: Stripe.Event): Promise<void> {
    this.logger.appendKeys({
      eventType: event.type
    });
    const handlerFn = this.eventHandlers.get(event.type as StripeEventType);
    if (!handlerFn) {
      this.logger.error(
        'Unhandled event type. This means the integration on Stripe side is configured to send event types for which there is no event handlers in code'
      );
      return this.onUnhandledEvent(event);
    }

    return this.identityExtractor
      .extract(event)
      .then(
        tap((userIdentity) => {
          this.logger.appendKeys({
            ...userIdentity
          });
        })
      )
      .then((userIdentity) =>
        handlerFn(event.type as StripeEventType)
          .handle(event, userIdentity)
          .then(
            tap(() => {
              this.logger.info('Successfully processed event');
            })
          )
          .then(() =>
            this.eventPublisher.publish(event, userIdentity).catch((error) => {
              this.logger.error(
                `There was an error publishing an Stripe event after having processed it`,
                { cause: error, event }
              );
            })
          )
      )
      .catch((error) => {
        rethrowError('Error processing event', error, this.logger);
      });
  }
}
