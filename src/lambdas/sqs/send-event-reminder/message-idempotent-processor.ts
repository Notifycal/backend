import { logger } from '@common/powertools';
import type { ActionableEventReminderAttemptSentEvent } from '@model/app-events/ActionableEventReminderAttemptSentEvent';
import type { ActionableEventReminderAttemptSkippedEvent } from '@model/app-events/ActionableEventReminderAttemptSkippedEvent';
import type { DemoReminderToBeSentAttemptSentEvent } from '@model/app-events/DemoReminderToBeSentAttemptSentEvent';
import type { DemoReminderToBeSentAttemptSkippedEvent } from '@model/app-events/DemoReminderToBeSentAttemptSkippedEvent';
import type { MessagingEndpointConfig, MessagingTopicConfig } from '@model/Config';
import type { VonageEndpointConfig } from '@model/vendor/vonage';
import type { Uuid } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { MessagingService } from '@services/messaging';
import { SnsService } from '@services/sns';
import { withIntegrationMetrics } from '@utils/withIntegrationMetrics';
import { match } from 'ts-pattern';
import type { Record } from './index';

export default class MessageProcessor {
  private readonly _snsService: SnsService;
  private readonly _messagingService: MessagingService;
  private readonly _isMessagingEnabled: boolean;

  public constructor(
    config: VonageEndpointConfig & MessagingTopicConfig & MessagingEndpointConfig
  ) {
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
      .with({ eventType: 'DemoReminderToBeSent' }, (b) => ({
        ...b,
        eventType: 'DemoReminderToBeSentAttemptSent' as const,
        data: {
          ...b.data,
          messageUUID
        }
      }))
      .exhaustive();
    await this._snsService.safePublish<
      ActionableEventReminderAttemptSentEvent | DemoReminderToBeSentAttemptSentEvent
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
      .with({ eventType: 'DemoReminderToBeSent' }, (b) => ({
        ...b,
        eventType: 'DemoReminderToBeSentAttemptSkipped' as const,
        data: {
          ...b.data,
          messageUUID
        }
      }))
      .exhaustive();
    return this._snsService.safePublish<
      ActionableEventReminderAttemptSkippedEvent | DemoReminderToBeSentAttemptSkippedEvent
    >(e);
  }
}
