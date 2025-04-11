import { logger } from '@common/powertools';
import type { ActionableEventReminderAttemptSentEvent } from '@model/app-events/ActionableEventReminderAttemptSentEvent';
import type { ActionableEventReminderAttemptSkippedEvent } from '@model/app-events/ActionableEventReminderAttemptSkippedEvent';
import type { ReminderToBeSentAttemptSentEvent } from '@model/app-events/ReminderToBeSentAttemptSentEvent';
import type { ReminderToBeSentAttemptSkippedEvent } from '@model/app-events/ReminderToBeSentAttemptSkippedEvent';
import type { Uuid } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { MessagingService } from '@services/messaging';
import { SnsService } from '@services/sns';
import { withIntegrationMetrics } from '@utils/withIntegrationMetrics';
import { match } from 'ts-pattern';
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
    const e = match(body)
      .with({ eventType: 'ActionableEventFound' }, (b) => ({
        ...b,
        eventType: 'ActionableEventReminderAttemptSent' as const,
        data: {
          ...b.data,
          messageUUID
        }
      }))
      .with({ eventType: 'ReminderToBeSent' }, (b) => ({
        ...b,
        eventType: 'ReminderToBeSentAttemptSent' as const,
        data: {
          ...b.data,
          messageUUID
        }
      }))
      .exhaustive();
    await this._snsService.safePublish<
      ActionableEventReminderAttemptSentEvent | ReminderToBeSentAttemptSentEvent
    >(e);

    return messageUUID;
  }

  public async onIdempotencyHit(record: Record, messageUUID: Uuid): Promise<void> {
    const { body } = record;
    const e = match(body)
      .with({ eventType: 'ActionableEventFound' }, (b) => ({
        ...b,
        eventType: 'ActionableEventReminderAttemptSkipped' as const,
        data: {
          ...b.data,
          messageUUID
        }
      }))
      .with({ eventType: 'ReminderToBeSent' }, (b) => ({
        ...b,
        eventType: 'ReminderToBeSentAttemptSkipped' as const,
        data: {
          ...b.data,
          messageUUID
        }
      }))
      .exhaustive();
    return this._snsService.safePublish<
      ActionableEventReminderAttemptSkippedEvent | ReminderToBeSentAttemptSkippedEvent
    >(e);
  }
}
