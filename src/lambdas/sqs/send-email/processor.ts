import { logger } from '@common/powertools';
import type { EmailWithName } from '@model/app-events/common';
import type { EmailToBeSentAttemptSentEvent } from '@model/app-events/EmailToBeSentAttemptSentEvent';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type { EmailSendSuccessResponse, MailgunConfig } from '@model/vendor/mailgun';
import { EmailService } from '@services/email';
import type { SnsService } from '@services/sns';
import { toBase64 } from '@utils/crypto';

export class Processor {
  private readonly emailService: EmailService;

  public constructor(
    config: MailgunConfig,
    private readonly isEnabled: boolean,
    private readonly snsService: SnsService
  ) {
    this.emailService = new EmailService(config.baseUrl, config.domainName, config.apiKey);
  }

  public async process(
    event: EmailToBeSentEvent,
    from: EmailWithName
  ): Promise<EmailSendSuccessResponse> {
    let sendResponse: EmailSendSuccessResponse;
    if (this.isEnabled) {
      logger.info('Sending an email through Mailgun');
      sendResponse = await this.sendEmail(event, from);
    } else {
      logger.info('Simulating an email is being sent');
      sendResponse = await Promise.resolve({ id: 'fake-uuid', message: 'OK!' });
    }
    await this.publishAttemptSentEvent(event, sendResponse);

    return sendResponse;
  }

  private publishAttemptSentEvent(
    event: EmailToBeSentEvent,
    sendResponse: EmailSendSuccessResponse
  ): Promise<void> {
    logger.info('Attempt to publish an event');
    const e: EmailToBeSentAttemptSentEvent = {
      ...event,
      eventType: 'EmailToBeSentAttemptSent' as const,
      data: {
        ...event.data,
        vendorResponse: sendResponse
      }
    };
    return this.snsService.safePublish(e);
  }

  private sendEmail(
    event: EmailToBeSentEvent,
    from: EmailWithName
  ): Promise<EmailSendSuccessResponse> {
    const { htmlBody, subject, to } = event.data;
    return this.emailService.sendEmail(
      from,
      to,
      subject,
      htmlBody,
      {
        originalBase64Event: toBase64(event),
        eventId: event.eventId,
        userId: event.userId,
        correlationId: event.correlationId,
        eventType: event.eventType,
        idp: event.idp,
        idpId: event.idpId,
        happenedAt: event.happenedAt
      },
      event.data.tags //TODO: add subEventType once we come up with a final structure for EmailToBeSent.
    );
  }
}
