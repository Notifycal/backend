import { logger } from '@common/powertools';
import type { ActionableEventReminderAttemptSentEvent } from '@model/app-events/ActionableEventReminderAttemptSentEvent';
import type { ActionableEventReminderAttemptSkippedEvent } from '@model/app-events/ActionableEventReminderAttemptSkippedEvent';
import type { Uuid } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { MessagingService } from '@services/messaging';
import { SnsService } from '@services/sns';
import { withIntegrationMetrics } from '@utils/withIntegrationMetrics';
import type { SendEventReminderConfig } from './config';
import type { Record } from './index';

export default class MessageProcessor {
  private readonly _snsService: SnsService;
  private readonly _messagingService: MessagingService;
  private readonly _isMessagingEnabled: boolean;

  public constructor(config: SendEventReminderConfig) {
    this._snsService = SnsService.withConfig(config.messagingTopicConfig);
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
      receiverDetails
    });

    let messageUUID;
    if (this._isMessagingEnabled) {
      logger.info('Sending a message through Vonage');
      messageUUID = await withIntegrationMetrics('Vonage', 'SendEventReminder', () =>
        this._messagingService.sendMessage(
          message,
          senderDetails,
          receiverDetails,
          correlationId,
          webhookUrl
        )
      );
    } else {
      logger.info('Simulating a message is being sent');
      messageUUID = await Promise.resolve('fake-uuid' as Uuid);
    }

    logger.info('Attempt to publish an event');
    await this._snsService.safePublish<ActionableEventReminderAttemptSentEvent>({
      ...body,
      eventType: 'ActionableEventReminderAttemptSent',
      data: {
        ...body.data,
        messageUUID
      }
    });

    return messageUUID;
  }

  public async onIdempotencyHit(record: Record, messageUUID: Uuid): Promise<void> {
    const { body } = record;
    return this._snsService.safePublish<ActionableEventReminderAttemptSkippedEvent>({
      ...body,
      eventType: 'ActionableEventReminderAttemptSkipped',
      data: {
        ...body.data,
        messageUUID
      }
    });
  }
}
