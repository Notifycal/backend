import type { DynamoDBPersistenceOptions } from '@aws-lambda-powertools/idempotency/dynamodb/types';
import type { Logger } from '@aws-lambda-powertools/logger';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { ActionableEventReminderAttemptFailedEvent } from '@model/app-events/ActionableEventReminderAttemptFailedEvent';
import type { ActionableEventReminderAttemptSkippedEvent } from '@model/app-events/ActionableEventReminderAttemptSkippedEvent';
import type { DemoReminderToBeSentAttemptFailedEvent } from '@model/app-events/DemoReminderToBeSentAttemptFailedEvent';
import type { DemoReminderToBeSentAttemptSkippedEvent } from '@model/app-events/DemoReminderToBeSentAttemptSkippedEvent';
import type { DemoReminderToBeSentEvent } from '@model/app-events/DemoReminderToBeSentEvent';
import type {
  CreditServiceEndpointConfig,
  DemoReminderEndpointConfig,
  MessagingAlertingEndpointConfig
} from '@model/Config';
import type { VonageEndpointConfig } from '@model/vendor/vonage/config';
import type { IdpName, Uuid } from '@notifycal/shared/types';
import { AbstractIdempotentProcessor } from '@services/abstract-idempotent-processor';
import type { CreditsService } from '@services/credits-service';
import type { SnsService } from '@services/sns';
import type { Context } from 'aws-lambda';
import { match } from 'ts-pattern';
import Processor from './processor';

export class IdempotentProcessor extends AbstractIdempotentProcessor<Uuid> {
  private readonly processor: Processor;

  public constructor(
    config: VonageEndpointConfig &
      CreditServiceEndpointConfig &
      DemoReminderEndpointConfig &
      MessagingAlertingEndpointConfig,
    persistanceConfig: DynamoDBPersistenceOptions,
    isEnabled: boolean,
    context: Context,
    private readonly snsService: SnsService,
    creditService: CreditsService<IdpName>,
    logger: Logger
  ) {
    super(persistanceConfig, context, logger);
    this.processor = new Processor(config, isEnabled, snsService, creditService, logger);
  }

  public sendReminderIdempotently(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent
  ): Promise<Uuid> {
    const idempotencyOptions = {
      eventKeyJmesPath: '[data.message, data.senderDetails, data.receiverDetails]',
      expiresAfterSeconds: 86400
    };
    const idempotencyFunctionOptions = {
      dataIndexArgument: 0
    };

    return this.processIdempotently(
      (event: ActionableEventFoundEvent | DemoReminderToBeSentEvent) =>
        this.processor.process(event),
      [event],
      this.onIdempotencyHit(event),
      this.onError(event),
      idempotencyOptions,
      idempotencyFunctionOptions
    );
  }

  private onError(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent
  ): () => Promise<void> {
    const errorEvent = match(event)
      .with({ eventType: 'ActionableEventFound' }, (e) => ({
        ...e,
        eventType: 'ActionableEventReminderAttemptFailed' as const
      }))
      .with({ eventType: 'DemoReminderToBeSent' }, (e) => ({
        ...e,
        eventType: 'DemoReminderToBeSentAttemptFailed' as const
      }))
      .exhaustive();
    return () =>
      this.snsService.safePublish<
        ActionableEventReminderAttemptFailedEvent | DemoReminderToBeSentAttemptFailedEvent
      >(errorEvent);
  }

  private onIdempotencyHit(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent
  ): (messageUUID: Uuid) => Promise<void> {
    return (messageUUID: Uuid) => {
      const e = match(event)
        .with({ eventType: 'ActionableEventFound' }, (e) => ({
          ...e,
          eventType: 'ActionableEventReminderAttemptSkipped' as const,
          data: {
            ...e.data,
            messageUUID
          }
        }))
        .with({ eventType: 'DemoReminderToBeSent' }, (e) => ({
          ...e,
          eventType: 'DemoReminderToBeSentAttemptSkipped' as const,
          data: {
            ...e.data,
            messageUUID
          }
        }))
        .exhaustive();
      return this.snsService.safePublish<
        ActionableEventReminderAttemptSkippedEvent | DemoReminderToBeSentAttemptSkippedEvent
      >(e);
    };
  }
}
