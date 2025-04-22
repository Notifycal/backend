import { logger } from '@common/powertools';
import type { EmailWithName } from '@model/app-events/common';
import type { EmailToBeSentAttemptSentEvent } from '@model/app-events/EmailToBeSentAttemptSentEvent';
import type { EmailToBeSentEvent } from '@model/app-events/EmailToBeSentEvent';
import type { EmailSendSuccessResponse, MailgunConfig } from '@model/vendor/mailgun';
import { EmailService } from '@services/email';
import type { SnsService } from '@services/sns';
import { toBase64 } from '@utils/cripto';
import type { Base64Event } from '.';

export class Processor {
  private readonly emailingService: EmailService;

  public constructor(
    private readonly config: MailgunConfig,
    private readonly isEnabled: boolean,
    private readonly snsService: SnsService
  ) {
    this.emailingService = new EmailService(config.baseUrl, config.domainName, config.apiKey);
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

    const e: EmailToBeSentAttemptSentEvent = {
      ...event,
      eventType: 'EmailToBeSentAttemptSent' as const,
      data: {
        ...event.data,
        vendorResponse: sendResponse
      }
    };
    logger.info('Attempt to publish an event');
    await this.snsService.safePublish(e);

    return sendResponse;
  }

  private sendEmail(
    event: EmailToBeSentEvent,
    from: EmailWithName
  ): Promise<EmailSendSuccessResponse> {
    const { htmlBody, subject, to } = event.data;
    return this.emailingService.sendEmail(
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
    );
  }

  protected encodeBase64(event: EmailToBeSentEvent): Base64Event {
    const eventData: Omit<EmailToBeSentEvent, 'eventId' | 'happenedAt'> = {
      eventType: event.eventType,
      correlationId: event.correlationId,
      userId: event.userId,
      idp: event.idp,
      idpId: event.idpId,
      data: event.data
    };
    return toBase64(eventData) as Base64Event;
  }
}
