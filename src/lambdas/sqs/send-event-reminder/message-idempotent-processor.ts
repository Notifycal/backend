import { logger } from '@common/powertools';
import type { Record } from './index';
import type { SendEventReminderConfig } from './config';
import { MessagingService } from '@services/messaging';
import type { CalendarEventReminderAttemptSentEvent } from '@model/app-events/CalendarEventReminderAttemptSentEvent';
import type { CalendarEventReminderAttemptSkippedEvent } from '@model/app-events/CalendarEventReminderAttemptSkippedEvent';
import type { Uuid } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { AuditTrailService } from '@services/audit-trail';

export default class MessageProcessor {
  private readonly _auditTrailService: AuditTrailService;
  private readonly _messagingService: MessagingService;

  public constructor(config: SendEventReminderConfig) {
    this._auditTrailService = AuditTrailService.withConfig(config.auditTrailQueueConfig);
    this._messagingService = new MessagingService(
      config.vonageConfig.applicationId,
      config.vonageConfig.vonagePrivateKey
    );
  }

  public sendReminder = async (record: Record): Promise<Uuid> => {
    const { body } = record;

    logger.info(`Message: ${body.data.message}`);
    logger.info(`Sender: ${JSON.stringify(body.data.senderDetails.identifier)}`);
    logger.info(`Receiver: ${JSON.stringify(body.data.receiverDetails.identifier)}`);

    const { correlationId } = body;
    const { message } = body.data;
    const { senderDetails, receiverDetails } = body.data;

    logger.info(`Sending a message through Vonage. correlationId: ${correlationId}`);

    let messageUUID;
    if (process.env.MESSAGING_ENABLED === 'true') {
      messageUUID = await this._messagingService.sendMessage(
        message,
        senderDetails,
        receiverDetails,
        correlationId
      );
    } else {
      messageUUID = await Promise.resolve('fake-uuid' as Uuid);
    }

    logger.info(`Sending message attempt to audit trail. correlationId: ${correlationId}`);
    try {
      await this._auditTrailService.send<CalendarEventReminderAttemptSentEvent>({
        ...body,
        eventType: 'CalendarEventReminderAttemptSent',
        data: {
          ...body.data,
          messageUUID
        }
      });
      logger.info(`Message attempt sent to audit trail. correlationId: ${correlationId}`);
    } catch (err) {
      // Not throwing an error if sending to audit trail fails as we wouldn't want the lambda to fail (and retry) because of it.
      logger.error(
        `Could not send Message attempt to audit trail. correlationId: ${correlationId}. Cause: ${JSON.stringify(err)}`
      );
    }

    return messageUUID;
  };

  public async onIdempotencyHit(record: Record, messageUUID: Uuid): Promise<void> {
    const { body } = record;
    const { correlationId } = body;

    try {
      await this._auditTrailService.send<CalendarEventReminderAttemptSkippedEvent>({
        ...body,
        eventType: 'CalendarEventReminderAttemptSkipped',
        data: {
          ...body.data,
          messageUUID
        }
      });
    } catch (err) {
      logger.error(
        `Could not send duplicated message attempt to audit trail. correlationId: ${correlationId}. Cause: ${JSON.stringify(err)}`
      );
    }
  }
}
