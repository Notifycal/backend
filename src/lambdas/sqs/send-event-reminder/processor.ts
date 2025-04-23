import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { ActionableEventReminderAttemptSentEvent } from '@model/app-events/ActionableEventReminderAttemptSentEvent';
import type { DemoReminderToBeSentAttemptSentEvent } from '@model/app-events/DemoReminderToBeSentAttemptSentEvent';
import type { DemoReminderToBeSentEvent } from '@model/app-events/DemoReminderToBeSentEvent';
import type { VonageConfig } from '@model/vendor/vonage';
import type { Uuid } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { type VonagePrivateKey, MessagingService } from '@services/messaging';
import type { SnsService } from '@services/sns';
import { objectToQueryString } from '@utils/queryString';
import { match } from 'ts-pattern';

export default class Processor {
  private readonly _messagingService: MessagingService;

  public constructor(
    private readonly config: VonageConfig & { privateKey: VonagePrivateKey },
    private readonly isEnabled: boolean,
    private readonly snsService: SnsService
  ) {
    this._messagingService = new MessagingService(config.applicationId, config.privateKey);
  }

  private buildWebhookUrl(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent,
    baseWebhookUrl: Url
  ): Url {
    const queryStringEventData: Omit<
      ActionableEventFoundEvent | DemoReminderToBeSentEvent,
      'eventId' | 'happenedAt'
    > = {
      eventType: event.eventType,
      correlationId: event.correlationId,
      userId: event.userId,
      idp: event.idp,
      idpId: event.idpId,
      data: event.data
    };
    const recordQs = objectToQueryString(queryStringEventData);
    const webhookUrl = `${baseWebhookUrl}?${recordQs}` as Url;
    logger.info('FullWebhookUrl', { webhookUrl });
    return webhookUrl;
  }

  public async process(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent
  ): Promise<Uuid> {
    const { correlationId } = event;
    const { message, senderDetails, receiverDetails } = event.data;

    logger.appendKeys({
      reminderMessage: message,
      senderDetails,
      receiverDetails
    });

    let messageUUID;
    if (this.isEnabled) {
      logger.info('Sending a message through Vonage');
      messageUUID = await this._messagingService.sendMessage(
        message,
        senderDetails,
        receiverDetails,
        correlationId,
        this.buildWebhookUrl(event, this.config.webhookBaseURL)
      );
    } else {
      logger.info('Simulating a message is being sent');
      messageUUID = await Promise.resolve('fake-uuid' as Uuid);
    }

    await this.publishAttemptSentEvent(event, messageUUID);

    return messageUUID;
  }

  private publishAttemptSentEvent(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent,
    messageUUID: Uuid
  ): Promise<void> {
    logger.info('Attempt to publish an event');
    const attemptSentEvent = match(event)
      .with({ eventType: 'ActionableEventFound' }, (e) => ({
        ...e,
        eventType: 'ActionableEventReminderAttemptSent' as const,
        data: {
          ...e.data,
          messageUUID
        }
      }))
      .with({ eventType: 'DemoReminderToBeSent' }, (e) => ({
        ...e,
        eventType: 'DemoReminderToBeSentAttemptSent' as const,
        data: {
          ...e.data,
          messageUUID
        }
      }))
      .exhaustive();
    return this.snsService.safePublish<
      ActionableEventReminderAttemptSentEvent | DemoReminderToBeSentAttemptSentEvent
    >(attemptSentEvent);
  }
}
