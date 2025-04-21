import { logger } from '@common/powertools';
import type { EmailWithName } from '@model/app-events/common';
import type { EmailToBeSentAttemptSentEvent } from '@model/app-events/EmailToBeSentAttemptSentEvent';
import type { EmailToBeSentAttemptSkippedEvent } from '@model/app-events/EmailToBeSentAttemptSkippedEvent';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type { EmailSendSuccessResponse } from '@model/vendor/mailgun';
import { EmailService } from '@services/email';
import { SnsService } from '@services/sns';
import { withIntegrationMetrics } from '@utils/withIntegrationMetrics';
import type { SendEmailConfig } from './config';
import type { Base64Event } from './index';

export default class MessageProcessor {
  private readonly _snsService: SnsService;
  private readonly _emailingService: EmailService;
  private readonly _isEmailingEnabled: boolean;

  public constructor(config: SendEmailConfig) {
    this._snsService = SnsService.withConfig(config.emailingTopicConfig);
    this._emailingService = new EmailService(config.baseUrl, config.domainName, config.apiKey);
    this._isEmailingEnabled = config.emailingConfig.enabled;
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

  public async sendEmail(
    event: EmailToBeSentEvent,
    from: EmailWithName
  ): Promise<EmailSendSuccessResponse> {
    const { htmlBody, subject, to } = event.data;

    let sendResponse: EmailSendSuccessResponse;
    if (this._isEmailingEnabled) {
      logger.info('Sending an email through Mailgun');
      sendResponse = await withIntegrationMetrics('Mailgun', 'SendEmail', () =>
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
