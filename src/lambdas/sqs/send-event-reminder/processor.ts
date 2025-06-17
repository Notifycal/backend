import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { ActionableEventReminderAttemptSentEvent } from '@model/app-events/ActionableEventReminderAttemptSentEvent';
import type { ActionableEventReminderLowCreditNotSentEvent } from '@model/app-events/ActionableEventReminderLowCreditNotSentEvent';
import type { DemoReminderLowCreditNotSentEventSchemaEvent } from '@model/app-events/DemoReminderLowBalandeNotSentEvent';
import type { DemoReminderToBeSentAttemptSentEvent } from '@model/app-events/DemoReminderToBeSentAttemptSentEvent';
import type { DemoReminderToBeSentEvent } from '@model/app-events/DemoReminderToBeSentEvent';
import type { CreditServiceEndpointConfig } from '@model/Config';
import type { VonageEndpointConfig } from '@model/vendor/vonage/config';
import type { IdpName, UserId, Uuid } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import type {
  CreditDeductionInsufficientCreditsError,
  CreditDeductionResult,
  CreditDeductionUnexpectedError,
  CreditsService
} from '@services/credits-service';
import { MessagingService } from '@services/messaging';
import type { SnsService } from '@services/sns';
import { tap } from '@utils/promises';
import { objectToQueryString } from '@utils/queryString';
import { count } from 'sms-length/src/index';
import { match } from 'ts-pattern';

export default class Processor {
  private readonly _messagingService: MessagingService;

  public constructor(
    private readonly config: VonageEndpointConfig & CreditServiceEndpointConfig,
    private readonly isEnabled: boolean,
    private readonly snsService: SnsService,
    private readonly creditsService: CreditsService<IdpName>
  ) {
    this._messagingService = new MessagingService(
      config.vonageConfig.applicationId,
      config.vonageConfig.privateKey
    );
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

    const result = await this.deductCredits(event.userId, message);

    if (!result.success) {
      return this.handleCreditDeductionFailure(result, event);
    }

    let messageUUID;
    if (this.isEnabled) {
      logger.info('Sending a message through Vonage');
      messageUUID = await this._messagingService.sendMessage(
        message,
        senderDetails,
        receiverDetails,
        correlationId,
        this.buildWebhookUrl(event, this.config.vonageConfig.webhookBaseURL)
      );
    } else {
      logger.info('Simulating a message is being sent');
      messageUUID = await Promise.resolve('fake-uuid' as Uuid);
    }
    await this.publishAttemptSentEvent(event, messageUUID);

    return messageUUID;
  }

  private async handleCreditDeductionFailure(
    result: CreditDeductionInsufficientCreditsError | CreditDeductionUnexpectedError,
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent
  ): Promise<never> {
    const error = await match(result)
      .with({ operationId: 'InsufficientCredits' }, async (result) => {
        const error = new Error(`A message could not be sent due to insufficient credits`, {
          cause: result.error
        });

        await this.publishLowCreditErrorEvent(event, result);
        return error;
      })
      .with({ operationId: 'UnknownError' }, (result) => {
        return new Error(
          `A message could not be sent due to an unknown issue while deducting the credits`,
          { cause: result.error }
        );
      })
      .exhaustive();

    logger.warn(error.message, { result });
    return Promise.reject(error);
  }

  private deductCredits(userId: UserId, message: string): Promise<CreditDeductionResult> {
    const countResult = count(message);
    return this.creditsService
      .deductCredits(userId, countResult.messages, 'ES', this.config.countryToSMSCostCreditsMap)
      .then(
        tap((result) => {
          logger.info(`Number of SMSs charged: ${countResult.messages}`, {
            estimatedMessageCount: countResult,
            updatedUserCredit: result
          });
        })
      );
  }

  private publishAttemptSentEvent(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent,
    messageUUID: Uuid
  ): Promise<void> {
    logger.info('Publishing an event indicating the attempt to send a message');
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

  private publishLowCreditErrorEvent(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent,
    creditError: CreditDeductionResult
  ): Promise<void> {
    logger.info(
      'Publishing an event indicating a message could not be sent due to user low credits'
    );
    const lowCreditEvent = match(event)
      .with({ eventType: 'ActionableEventFound' }, (e) => ({
        ...e,
        eventType: 'ActionableEventReminderLowCreditNotSent' as const,
        data: {
          originalEvent: {
            ...e.data
          },
          error: creditError
        }
      }))
      .with({ eventType: 'DemoReminderToBeSent' }, (e) => ({
        ...e,
        eventType: 'DemoReminderLowCreditNotSent' as const,
        data: {
          originalEvent: {
            ...e.data
          },
          error: creditError
        }
      }))
      .exhaustive();
    return this.snsService.safePublish<
      ActionableEventReminderLowCreditNotSentEvent | DemoReminderLowCreditNotSentEventSchemaEvent
    >(lowCreditEvent);
  }
}