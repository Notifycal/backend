import type { JSONValue } from '@aws-lambda-powertools/commons/types';
import { IdempotencyConfig, makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import type { DynamoDBPersistenceOptions } from '@aws-lambda-powertools/idempotency/dynamodb/types';
import { logger } from '@common/powertools';
import type { EmailWithName } from '@model/app-events/common';
import type { EmailToBeSentAttemptFailedEvent } from '@model/app-events/EmailToBeSentAttemptFailedEvent';
import type { EmailToBeSentAttemptSentEvent } from '@model/app-events/EmailToBeSentAttemptSentEvent';
import type { EmailToBeSentAttemptSkippedEvent } from '@model/app-events/EmailToBeSentAttemptSkippedEvent';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type { EmailingTopicConfig } from '@model/Config';
import type { EmailSendSuccessResponse, MailgunEndpointConfig } from '@model/vendor/mailgun';
import { EmailService } from '@services/email';
import { SnsService } from '@services/sns';
import { tap } from '@utils/promises';
import { withIntegrationMetrics } from '@utils/withIntegrationMetrics';
import type { Context } from 'aws-lambda';
import type { Base64Event } from './index';

export default class MessageProcessor {
  private readonly _snsService: SnsService;
  private readonly _emailingService: EmailService;

  public constructor(
    private readonly config: MailgunEndpointConfig & EmailingTopicConfig,
    private readonly _isEmailingEnabled: boolean,
    private readonly persistanceConfig: DynamoDBPersistenceOptions,
    private readonly context: Context
  ) {
    this._snsService = SnsService.withConfig(config.emailingTopicConfig);
    this._emailingService = new EmailService(
      config.mailgunConfig.baseUrl,
      config.mailgunConfig.domainName,
      config.mailgunConfig.apiKey
    );
  }

  private _sendEmail(
    event: EmailToBeSentEvent,
    from: EmailWithName
  ): Promise<EmailSendSuccessResponse> {
    const { htmlBody, subject, to } = event.data;
    return withIntegrationMetrics('Mailgun', 'SendEmail', () =>
      this._emailingService.sendEmail(
        from,
        to,
        subject,
        htmlBody,
        {
          originalBase64Event: this.encodeBase64(event),
          eventId: event.eventId,
          userId: event.userId,
          correlationId: event.correlationId,
          eventType: event.eventType,
          idp: event.idp,
          idpId: event.idpId,
          happenedAt: event.happenedAt
        },
        event.data.tags
      )
    );
  }

  private encodeBase64(event: EmailToBeSentEvent): Base64Event {
    const eventData: Omit<EmailToBeSentEvent, 'eventId' | 'happenedAt'> = {
      eventType: event.eventType,
      correlationId: event.correlationId,
      userId: event.userId,
      idp: event.idp,
      idpId: event.idpId,
      data: event.data
    };
    const jsonString = JSON.stringify(eventData);
    return Buffer.from(jsonString).toString('base64') as Base64Event;
  }

  private async sendEmail(
    event: EmailToBeSentEvent,
    from: EmailWithName
  ): Promise<EmailSendSuccessResponse> {
    let sendResponse: EmailSendSuccessResponse;
    if (this._isEmailingEnabled) {
      logger.info('Sending an email through Mailgun');
      sendResponse = await this._sendEmail(event, from);
    } else {
      logger.info('Simulating an email is being sent');
      sendResponse = await Promise.resolve({ id: 'fake-uuid', message: 'OK!' });
    }

    logger.info('Attempt to publish an event');
    const e: EmailToBeSentAttemptSentEvent = {
      ...event,
      eventType: 'EmailToBeSentAttemptSent' as const,
      data: {
        ...event.data,
        vendorResponse: sendResponse
      }
    };
    await this._snsService.safePublish(e);

    return sendResponse;
  }

  private handleReminderAttemptFailure(
    event: EmailToBeSentEvent,
    config: EmailingTopicConfig['emailingTopicConfig']
  ): Promise<void> {
    const snsService = SnsService.withConfig(config);
    const errorEvent: EmailToBeSentAttemptFailedEvent = {
      ...event,
      eventType: 'EmailToBeSentAttemptFailed' as const
    };
    return snsService.safePublish(errorEvent);
  }

  private isIdempotencyHit = false;
  private readonly responseHook = (response: JSONValue): JSONValue => {
    this.isIdempotencyHit = true;
    return response;
  };

  private buildSendEmailIdempotentlyFn(): (
    event: EmailToBeSentEvent,
    from: EmailWithName
  ) => Promise<EmailSendSuccessResponse> {
    const idempotencyConfig = new IdempotencyConfig({
      eventKeyJmesPath: '[data.htmlBody, data.to, data.subject]',
      expiresAfterSeconds: 86400,
      throwOnNoIdempotencyKey: true,
      responseHook: this.responseHook
    });
    idempotencyConfig.registerLambdaContext(this.context);

    const idempotencyPersistence = new DynamoDBPersistenceLayer(this.persistanceConfig);
    return makeIdempotent(
      (event: EmailToBeSentEvent, from: EmailWithName) => this.sendEmail(event, from),
      {
        dataIndexArgument: 0, // Which argument will be used as a PK for idempotency in the store
        persistenceStore: idempotencyPersistence,
        config: idempotencyConfig
      }
    );
  }

  public sendEmailIdempotently(event: EmailToBeSentEvent, from: EmailWithName): Promise<EmailSendSuccessResponse> {
    return this.buildSendEmailIdempotentlyFn()(event, from).then(
      tap(async (sendResponse) => {
        if (this.isIdempotencyHit) {
          await this.onIdempotencyHit(event, sendResponse);
        }
      }),
      async (err) => {
        await this.handleReminderAttemptFailure(event, this.config.emailingTopicConfig);
        throw err;
      }
    );
  }

  public async onIdempotencyHit(
    event: EmailToBeSentEvent,
    sendResponse: EmailSendSuccessResponse
  ): Promise<void> {
    const e: EmailToBeSentAttemptSkippedEvent = {
      ...event,
      eventType: 'EmailToBeSentAttemptSkipped' as const,
      data: {
        ...event.data,
        vendorResponse: sendResponse
      }
    };
    return this._snsService.safePublish(e);
  }
}
