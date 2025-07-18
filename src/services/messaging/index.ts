import type { Logger } from '@aws-lambda-powertools/logger';
import type { WebhookCorrelationData } from '@lambdas/api/post-event-reminder-delivery-status-webhook/schema';
import {
  actionableEventReminderAttemptSent,
  type ActionableEventReminderAttemptSentEvent
} from '@model/app-events/ActionableEventReminderAttemptSentEvent';
import {
  demoReminderToBeSentAttemptSent,
  type DemoReminderToBeSentAttemptSentEvent
} from '@model/app-events/DemoReminderToBeSentAttemptSentEvent';
import type { MessagingEndpointConfig } from '@model/Config';
import type { VonageEndpointConfig } from '@model/vendor/vonage/config';
import type { Url, Uuid } from '@notifycal/shared/types';
import { objectToQueryString } from '@utils/queryString';
import { match } from 'ts-pattern';
import type { SnsService } from '../sns';
import { VonageMessagingService } from '../vonage';
import type { EventWithSuccessfulDeduction } from './model';

export class MessagingService {
  private readonly _messagingService: VonageMessagingService;
  public constructor(
    private readonly config: VonageEndpointConfig & MessagingEndpointConfig,
    private readonly snsService: SnsService,
    private readonly logger: Logger
  ) {
    this._messagingService = new VonageMessagingService(
      config.vonageConfig.applicationId,
      config.vonageConfig.privateKey,
      logger
    );
  }

  public sendMessage(eventWithDeduction: EventWithSuccessfulDeduction): Promise<Uuid> {
    const {
      correlationId,
      data: { message, senderDetails, receiverDetails }
    } = eventWithDeduction.event;

    if (this.config.messagingConfig.enabled) {
      this.logger.info('Sending a message through Vonage');
      return this._messagingService
        .sendMessage(
          message,
          senderDetails,
          receiverDetails,
          correlationId,
          this.buildWebhookUrl(eventWithDeduction)
        )
        .then((messageUUID) => {
          return this.publishAttemptSentEvent(eventWithDeduction, messageUUID).then(
            () => messageUUID
          );
        });
    } else {
      this.logger.info('Simulating a message is being sent');
      const fakeUUID = 'fake-uuid' as Uuid;
      return this.publishAttemptSentEvent(eventWithDeduction, fakeUUID).then(() => fakeUUID);
    }
  }

  private buildWebhookUrl(eventWithDeduction: EventWithSuccessfulDeduction): Url {
    const webhookCorrelationData: WebhookCorrelationData = match(eventWithDeduction)
      .with({ event: { eventType: 'ActionableEventFound' } }, (data) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { eventId, happenedAt, ...originalEvent } = data.event;
        return {
          originalEvent,
          creditDeductionResult: data.deductionResult,
          estimatedMessageCount: data.numberOfMessagesEstimate
        };
      })
      .with({ event: { eventType: 'DemoReminderToBeSent' } }, (data) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { eventId, happenedAt, ...originalEvent } = data.event;
        return {
          originalEvent,
          creditDeductionResult: data.deductionResult,
          estimatedMessageCount: data.numberOfMessagesEstimate
        };
      })
      .exhaustive();

    const recordQs = objectToQueryString(webhookCorrelationData);
    const webhookUrl = `${this.config.vonageConfig.webhookBaseURL}?${recordQs}` as Url;
    this.logger.info('FullWebhookUrl', { webhookUrl });
    return webhookUrl;
  }

  private publishAttemptSentEvent(
    eventWithDeduction: EventWithSuccessfulDeduction,
    messageUUID: Uuid
  ): Promise<void> {
    this.logger.info('Publishing an event indicating the attempt to send a message');
    const attemptSentEvent = match(eventWithDeduction)
      .with({ event: { eventType: 'ActionableEventFound' } }, ({ event, deductionResult }) =>
        actionableEventReminderAttemptSent(event, messageUUID, deductionResult)
      )
      .with({ event: { eventType: 'DemoReminderToBeSent' } }, ({ event, deductionResult }) =>
        demoReminderToBeSentAttemptSent(event, messageUUID, deductionResult)
      )
      .exhaustive();
    return this.snsService.safePublish<
      ActionableEventReminderAttemptSentEvent | DemoReminderToBeSentAttemptSentEvent
    >(attemptSentEvent);
  }
}
