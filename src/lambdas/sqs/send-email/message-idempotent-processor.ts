import { logger } from '@common/powertools';
import type { EmailWithName } from '@model/app-events/common';
import type { EmailToBeSentAttemptSentEvent } from '@model/app-events/EmailToBeSentAttemptSentEvent';
import type { EmailToBeSentAttemptSkippedEvent } from '@model/app-events/EmailToBeSentAttemptSkippedEvent';
import type { SendSuccessResponse } from '@model/vendor/mailgun';
import { EmailService } from '@services/email';
import { SnsService } from '@services/sns';
import { withIntegrationMetrics } from '@utils/withIntegrationMetrics';
import type { SendEmailConfig } from './config';
import type { Base64Event, Record } from './index';

export default class MessageProcessor {
  private readonly _snsService: SnsService;
  private readonly _emailingService: EmailService;
  private readonly _isEmailingEnabled: boolean;

  public constructor(config: SendEmailConfig) {
    this._snsService = SnsService.withConfig(config.emailingTopicConfig);
    this._emailingService = new EmailService(config.baseUrl, config.domainName, config.apiKey);
    this._isEmailingEnabled = config.emailingConfig.enabled;
  }

  public async sendEmail(
    record: Record,
    from: EmailWithName,
    metadata: Base64Event
  ): Promise<SendSuccessResponse> {
    const { body } = record;
    const { htmlBody, subject, to } = body.data;

    // logger.appendKeys({
    //   reminderMessage: message,
    //   senderDetails,
    //   receiverDetails
    // });

    let sendResponse: SendSuccessResponse;
    if (this._isEmailingEnabled) {
      logger.info('Sending an email through Mailgun');
      sendResponse = await withIntegrationMetrics('Mailgun', 'SendEmail', () =>
        this._emailingService.sendEmail(to, from, subject, htmlBody, {
          originalEvent: metadata
        })
      );
    } else {
      logger.info('Simulating an email is being sent');
      sendResponse = await Promise.resolve({ id: 'fake-uuid', message: 'OK!' });
    }

    logger.info('Attempt to publish an event');
    const e: EmailToBeSentAttemptSentEvent = {
      ...body,
      eventType: 'EmailToBeSentAttemptSent' as const,
      data: {
        ...body.data,
        vendorResponse: sendResponse
      }
    };
    await this._snsService.safePublish(e);

    return sendResponse;
  }

  public async onIdempotencyHit(record: Record, sendResponse: SendSuccessResponse): Promise<void> {
    const { body } = record;
    const e: EmailToBeSentAttemptSkippedEvent = {
      ...body,
      eventType: 'EmailToBeSentAttemptSkipped' as const,
      data: {
        ...body.data,
        vendorResponse: sendResponse
      }
    };
    return this._snsService.safePublish(e);
  }
}
