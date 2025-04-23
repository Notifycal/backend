import type { DynamoDBPersistenceOptions } from '@aws-lambda-powertools/idempotency/dynamodb/types';
import { logger } from '@common/powertools';
import type { EmailWithName } from '@model/app-events/common';
import type { EmailToBeSentAttemptFailedEvent } from '@model/app-events/EmailToBeSentAttemptFailedEvent';
import type { EmailToBeSentAttemptSkippedEvent } from '@model/app-events/EmailToBeSentAttemptSkippedEvent';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type { EmailingTopicConfig } from '@model/Config';
import type { EmailSendSuccessResponse, MailgunEndpointConfig } from '@model/vendor/mailgun';
import { AbstractIdempotentProcessor } from '@services/abstract-idempotent-processor';
import { SnsService } from '@services/sns';
import type { Context } from 'aws-lambda';
import { Processor } from './processor';

export class IdempotentProcessor extends AbstractIdempotentProcessor<EmailSendSuccessResponse> {
  private readonly processor: Processor;

  public constructor(
    config: MailgunEndpointConfig & EmailingTopicConfig,
    persistanceConfig: DynamoDBPersistenceOptions,
    isEnabled: boolean,
    context: Context,
    private readonly snsService: SnsService
  ) {
    super(persistanceConfig, context);
    this.snsService = SnsService.withConfig(config.emailingTopicConfig);
    this.processor = new Processor(config.mailgunConfig, isEnabled, this.snsService);
  }

  public sendEmailIdempotently(
    event: EmailToBeSentEvent,
    from: EmailWithName
  ): Promise<EmailSendSuccessResponse> {
    const idempotencyOptions = {
      eventKeyJmesPath: '[data.htmlBody, data.to, data.subject]',
      expiresAfterSeconds: 86400
    };
    const idempotencyFunctionOptions = {
      dataIndexArgument: 0
    };

    logger.info('A message will be send if not sent yet');
    return this.processIdempotently(
      (event: EmailToBeSentEvent, from: EmailWithName) => this.processor.process(event, from),
      [event, from],
      this.onIdempotencyHit(event),
      this.onError(event),
      idempotencyOptions,
      idempotencyFunctionOptions
    );
  }

  private onError(event: EmailToBeSentEvent): () => Promise<void> {
    const errorEvent: EmailToBeSentAttemptFailedEvent = {
      ...event,
      eventType: 'EmailToBeSentAttemptFailed' as const
    };
    return () => this.snsService.safePublish(errorEvent);
  }

  private onIdempotencyHit(
    event: EmailToBeSentEvent
  ): (response: EmailSendSuccessResponse) => Promise<void> {
    return (response: EmailSendSuccessResponse) => {
      const e: EmailToBeSentAttemptSkippedEvent = {
        ...event,
        eventType: 'EmailToBeSentAttemptSkipped' as const,
        data: {
          ...event.data,
          vendorResponse: response
        }
      };
      return this.snsService.safePublish(e);
    };
  }
}
