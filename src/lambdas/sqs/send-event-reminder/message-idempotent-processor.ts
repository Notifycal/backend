import { logger } from '@common/powertools';
import type { ActionableEventReminderAttemptSentEvent } from '@model/app-events/ActionableEventReminderAttemptSentEvent';
import type { ActionableEventReminderAttemptSkippedEvent } from '@model/app-events/ActionableEventReminderAttemptSkippedEvent';
import type { Uuid } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { AuditTrailService } from '@services/audit-trail';
import { MessagingService } from '@services/messaging';
import type { SendEventReminderConfig } from './config';
import type { Record } from './index';

export default class MessageProcessor {
  private readonly _auditTrailService: AuditTrailService;
  private readonly _messagingService: MessagingService;
  private readonly _isMessagingEnabled: boolean;

  public constructor(config: SendEventReminderConfig) {
    this._auditTrailService = AuditTrailService.withConfig(config.auditTrailQueueConfig);
    this._messagingService = new MessagingService(
      config.vonageConfig.applicationId,
      config.vonageConfig.privateKey
    );
    this._isMessagingEnabled = config.messagingConfig.enabled;
  }

  public async sendReminder(record: Record, webhookUrl: Url): Promise<Uuid> {
    const { body } = record;
    const { correlationId } = body;
    const { message } = body.data;
    const { senderDetails, receiverDetails } = body.data;

    logger.appendKeys({
      reminderMessage: message,
      senderDetails,
      receiverDetails,
      correlationId
    });

    logger.info('Sending a message through Vonage');

    let messageUUID;
    if (this._isMessagingEnabled) {
      messageUUID = await this._messagingService.sendMessage(
        message,
        senderDetails,
        receiverDetails,
        correlationId,
        webhookUrl
      );
    } else {
      messageUUID = await Promise.resolve('fake-uuid' as Uuid);
    }

    logger.info('Sending message attempt to audit trail');
    try {
      await this._auditTrailService.send<ActionableEventReminderAttemptSentEvent>({
        ...body,
        eventType: 'ActionableEventReminderAttemptSent',
        data: {
          ...body.data,
          messageUUID
        }
      });
      logger.info('Message attempt sent to audit trail');
    } catch (error) {
      // Not throwing an error if sending to audit trail fails as we wouldn't want the lambda to fail (and retry) because of it.
      logger.error('Could not send message attempt to audit trail', {
        error
      });
    }

    return messageUUID;
  }

  public async onIdempotencyHit(record: Record, messageUUID: Uuid): Promise<void> {
    const { body } = record;
    const { correlationId } = body;

    logger.appendKeys({
      correlationId
    });

    try {
      await this._auditTrailService.send<ActionableEventReminderAttemptSkippedEvent>({
        ...body,
        eventType: 'ActionableEventReminderAttemptSkipped',
        data: {
          ...body.data,
          messageUUID
        }
      });
    } catch (error) {
      logger.error('Could not send duplicated message attempt to audit trail', {
        error
      });
    }
  }
}
