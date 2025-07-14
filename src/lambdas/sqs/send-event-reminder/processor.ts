import type { Logger } from '@aws-lambda-powertools/logger';
import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import {
  actionableEventReminderAttemptSent,
  type ActionableEventReminderAttemptSentEvent
} from '@model/app-events/ActionableEventReminderAttemptSentEvent';
import {
  demoReminderLimitReachedNotSent,
  type DemoReminderLimitReachedNotSentEvent
} from '@model/app-events/DemoReminderLimitReachedNotSentEvent';
import {
  demoReminderToBeSentAttemptSent,
  type DemoReminderToBeSentAttemptSentEvent
} from '@model/app-events/DemoReminderToBeSentAttemptSentEvent';
import type { DemoReminderToBeSentEvent } from '@model/app-events/DemoReminderToBeSentEvent';
import {
  insufficientCreditReminderNotSent,
  type InsufficientCreditReminderNotSentEvent
} from '@model/app-events/InsufficientCreditsReminderNotSentEvent';
import { lowCreditsDetected } from '@model/app-events/LowCreditsDetectedEvent';
import type {
  CreditServiceEndpointConfig,
  DemoReminderEndpointConfig,
  MessagingAlertingEndpointConfig
} from '@model/Config';
import type {
  CreditDeductionInsufficientCreditsError,
  CreditDeductionResult,
  CreditDeductionSuccess,
  CreditOperationResult,
  DemoCounterIncrementSuccess,
  DemoCounterLimitReachedError
} from '@model/Credits';
import type { VonageEndpointConfig } from '@model/vendor/vonage/config';
import type { IdpName, Uuid } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { rejectWithError, rejectWithMessageAndError } from '@services/common/error-handling';
import type { CreditsService } from '@services/credits-service';
import { MessagingService } from '@services/messaging';
import type { SnsService } from '@services/sns';
import { tap } from '@utils/promises';
import { objectToQueryString } from '@utils/queryString';
import { count } from 'sms-length/src/index';
import { match } from 'ts-pattern';

export default class Processor {
  private readonly _messagingService: MessagingService;

  public constructor(
    private readonly config: VonageEndpointConfig &
      CreditServiceEndpointConfig &
      DemoReminderEndpointConfig &
      MessagingAlertingEndpointConfig,
    private readonly isEnabled: boolean,
    private readonly snsService: SnsService,
    private readonly creditsService: CreditsService<IdpName>,
    logger: Logger
  ) {
    this._messagingService = new MessagingService(
      config.vonageConfig.applicationId,
      config.vonageConfig.privateKey,
      logger
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

  public process(event: ActionableEventFoundEvent | DemoReminderToBeSentEvent): Promise<Uuid> {
    const { message, senderDetails, receiverDetails } = event.data;
    logger.appendKeys({
      reminderMessage: message,
      senderDetails,
      receiverDetails
    });

    return this.deductFromAllowance(event).then((deductionResult) => {
      if (!deductionResult.success) {
        return this.processAllowanceFailure(deductionResult, event);
      }
      return this.sendMessage(event).then(
        (messageUuid) => messageUuid,
        this.onSendFailure(event, deductionResult)
      );
    }, this.handleDeductFromAllowanceFailure());
  }

  private deductFromAllowance(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent
  ): Promise<CreditOperationResult> {
    return match(event)
      .with({ eventType: 'ActionableEventFound' }, (e) => this.deductCredits(e))
      .with({ eventType: 'DemoReminderToBeSent' }, (e) =>
        this.creditsService.incrementDemoReminderCount(
          e.userId,
          this.config.demoReminderConfig.demoReminderLimit
        )
      )
      .exhaustive();
  }

  private handleDeductFromAllowanceFailure(): (error: unknown) => Promise<never> {
    return (error: unknown) => {
      logger.error('Failed to deduct from allowance', { error });
      return rejectWithError(error);
    };
  }

  private onSendFailure(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent,
    result: CreditDeductionSuccess | DemoCounterIncrementSuccess
  ): (error: unknown) => Promise<never> {
    return (error: unknown) =>
      match(event)
        .with({ eventType: 'ActionableEventFound' }, (e) =>
          this.handleActionableEventSendFailure(e, result as CreditDeductionSuccess)(error)
        )
        .with({ eventType: 'DemoReminderToBeSent' }, (e) =>
          this.handleDemoReminderSendFailure(e)(error)
        )
        .exhaustive();
  }

  private handleActionableEventSendFailure(
    event: ActionableEventFoundEvent,
    creditResult: CreditDeductionSuccess
  ): (error: unknown) => Promise<never> {
    return (error: unknown) => {
      const { quantity, fromBalance } = creditResult.operationDetails;
      if (typeof quantity === 'number') {
        return this.creditsService.restoreCredits(event.userId, quantity, fromBalance).then(
          () => {
            logger.info('Credits restored after message send failure', {
              userId: event.userId,
              restoredCredits: quantity,
              balanceType: fromBalance
            });
            return rejectWithError(error);
          },
          (restoreError) => {
            logger.error('Failed to restore credits after message send failure', {
              userId: event.userId,
              creditsToRestore: quantity,
              balanceType: fromBalance,
              restoreError
            });
            return rejectWithError(error);
          }
        );
      } else {
        logger.error('Cannot restore credits: quantity is not a number', {
          userId: event.userId,
          quantity,
          fromBalance
        });
        return rejectWithError(error);
      }
    };
  }

  private handleDemoReminderSendFailure(
    event: DemoReminderToBeSentEvent
  ): (error: unknown) => Promise<never> {
    return (error: unknown) =>
      this.creditsService.decrementDemoReminderCount(event.userId).then(
        () => {
          logger.info('Demo counter decremented after message send failure', {
            userId: event.userId
          });
          return rejectWithError(error);
        },
        (decrementError) => {
          logger.error('Failed to decrement demo counter after message send failure', {
            userId: event.userId,
            decrementError
          });
          return rejectWithError(error);
        }
      );
  }

  private sendMessage(event: ActionableEventFoundEvent | DemoReminderToBeSentEvent): Promise<Uuid> {
    const {
      correlationId,
      data: { message, senderDetails, receiverDetails }
    } = event;

    if (this.isEnabled) {
      logger.info('Sending a message through Vonage');
      return this._messagingService
        .sendMessage(
          message,
          senderDetails,
          receiverDetails,
          correlationId,
          this.buildWebhookUrl(event, this.config.vonageConfig.webhookBaseURL)
        )
        .then((messageUUID) => {
          return this.publishAttemptSentEvent(event, messageUUID).then(() => messageUUID);
        });
    } else {
      logger.info('Simulating a message is being sent');
      const fakeUUID = 'fake-uuid' as Uuid;
      return this.publishAttemptSentEvent(event, fakeUUID).then(() => fakeUUID);
    }
  }

  private processAllowanceFailure(
    result: CreditOperationResult & { success: false },
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent
  ): Promise<Uuid> {
    return match(result)
      .with({ result: 'InsufficientCredits' }, (insufficientResult) => {
        logger.info('Message not sent due to insufficient credits', { result });
        return this.publishInsufficientCreditErrorEvent(
          event as ActionableEventFoundEvent,
          insufficientResult as CreditDeductionInsufficientCreditsError
        ).then(() => 'insufficient-credits' as Uuid);
      })
      .with({ result: 'DemoCounterLimitReachedError' }, (demoLimitResult) => {
        logger.info('Demo reminder not sent due to demo limit reached', { result });
        return this.publishDemoLimitReachedErrorEvent(
          event as DemoReminderToBeSentEvent,
          demoLimitResult as DemoCounterLimitReachedError
        ).then(() => 'demo-limit-reached' as Uuid);
      })
      .with({ result: 'BadRequestError' }, () => {
        const operationType =
          event.eventType === 'ActionableEventFound'
            ? 'credit deduction'
            : 'demo counter increment';
        return rejectWithMessageAndError(
          `A message could not be sent due to a bad request during ${operationType}`,
          result.error
        );
      })
      .with({ result: 'UnknownError' }, () => {
        const operationType =
          event.eventType === 'ActionableEventFound'
            ? 'credit deduction'
            : 'demo counter increment';
        return rejectWithMessageAndError(
          `A message could not be sent due to an unknown issue during ${operationType}`,
          result.error
        );
      })
      .exhaustive();
  }

  private deductCredits(event: ActionableEventFoundEvent): Promise<CreditDeductionResult> {
    const countResult = count(event.data.message);
    const creditToDeductPerUnit = this.config.countryToSMSCostCreditsMap['ES'];
    const totalCreditsToDeduct = creditToDeductPerUnit * countResult.messages;
    return this.creditsService.deductCredits(event.userId, totalCreditsToDeduct).then(
      tap((result) => {
        logger.info(`Number of SMSs charged: ${countResult.messages}`, {
          estimatedMessageCount: countResult,
          updatedUserCredit: result
        });
        return result.success
          ? this.publishLowCreditsDetectedEventIfThresholdHasBeenCrossed(
              event,
              result,
              totalCreditsToDeduct
            )
          : Promise.resolve(result);
      })
    );
  }

  private publishAttemptSentEvent(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent,
    messageUUID: Uuid
  ): Promise<void> {
    logger.info('Publishing an event indicating the attempt to send a message');
    const attemptSentEvent = match(event)
      .with({ eventType: 'ActionableEventFound' }, (e) =>
        actionableEventReminderAttemptSent(e, messageUUID)
      )
      .with({ eventType: 'DemoReminderToBeSent' }, (e) =>
        demoReminderToBeSentAttemptSent(e, messageUUID)
      )
      .exhaustive();
    return this.snsService.safePublish<
      ActionableEventReminderAttemptSentEvent | DemoReminderToBeSentAttemptSentEvent
    >(attemptSentEvent);
  }

  private publishInsufficientCreditErrorEvent(
    event: ActionableEventFoundEvent,
    creditError: CreditDeductionInsufficientCreditsError
  ): Promise<void> {
    logger.info(
      'Publishing an event indicating a message could not be sent due to user having insufficient credits'
    );
    const insufficientCreditEvent = insufficientCreditReminderNotSent(event, creditError);
    return this.snsService.safePublish<
      InsufficientCreditReminderNotSentEvent | DemoReminderLimitReachedNotSentEvent
    >(insufficientCreditEvent);
  }

  private publishDemoLimitReachedErrorEvent(
    event: DemoReminderToBeSentEvent,
    demoLimitError: DemoCounterLimitReachedError
  ): Promise<void> {
    logger.info(
      'Publishing an event indicating a demo reminder could not be sent due to demo limit reached'
    );
    const demoLimitEvent = demoReminderLimitReachedNotSent(event, demoLimitError);
    return this.snsService.safePublish<
      InsufficientCreditReminderNotSentEvent | DemoReminderLimitReachedNotSentEvent
    >(demoLimitEvent);
  }

  private publishLowCreditsDetectedEventIfThresholdHasBeenCrossed(
    event: ActionableEventFoundEvent,
    result: CreditDeductionSuccess,
    totalCreditsToDeduct: number
  ): Promise<CreditDeductionResult> {
    const { subscription, topup } = result.balances;
    const totalUpdatedCredits = subscription + topup;
    const previousTotalCredits = totalUpdatedCredits + totalCreditsToDeduct;
    const lowCreditsThreshold = this.config.messagingAlertingConfig.lowCreditThreshold;
    if (previousTotalCredits >= lowCreditsThreshold && totalUpdatedCredits < lowCreditsThreshold) {
      const lowCreditsDetectedEvent = lowCreditsDetected(event, result);
      return this.snsService.safePublish(lowCreditsDetectedEvent).then(() => result);
    }
    return Promise.resolve(result);
  }
}
