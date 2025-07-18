import type { Logger } from '@aws-lambda-powertools/logger';
import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import {
  demoReminderLimitReachedNotSent,
  type DemoReminderLimitReachedNotSentEvent
} from '@model/app-events/DemoReminderLimitReachedNotSentEvent';
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
  DemoCounterLimitReachedError
} from '@model/Credits';
import type { VonageEndpointConfig } from '@model/vendor/vonage/config';
import type { IdpName, Uuid } from '@notifycal/shared/types';
import { rejectWithError, rejectWithMessageAndError } from '@services/common/error-handling';
import type { CreditsService } from '@services/credits-service';
import { MessagingService } from '@services/messaging';
import {
  type EventWithDeduction,
  type EventWithFailedDeduction,
  type EventWithSuccessfulDeduction,
  isSuccessfulDeduction
} from '@services/messaging/model';
import type { SnsService } from '@services/sns';
import { tap } from '@utils/promises';
import { count } from 'sms-length/src/index';
import { match } from 'ts-pattern';

export default class Processor {
  private readonly _messagingService: MessagingService;

  public constructor(
    private readonly config: VonageEndpointConfig &
      CreditServiceEndpointConfig &
      DemoReminderEndpointConfig &
      MessagingAlertingEndpointConfig,
    isEnabled: boolean,
    private readonly snsService: SnsService,
    private readonly creditsService: CreditsService<IdpName>,
    logger: Logger
  ) {
    this._messagingService = new MessagingService(config, snsService, isEnabled, logger);
  }

  public process(event: ActionableEventFoundEvent | DemoReminderToBeSentEvent): Promise<Uuid> {
    const { message, senderDetails, receiverDetails } = event.data;
    logger.appendKeys({
      reminderMessage: message,
      senderDetails,
      receiverDetails
    });

    return this.deductFromAllowance(event).then((eventWithDeduction) => {
      if (!isSuccessfulDeduction(eventWithDeduction)) {
        return this.processAllowanceFailure(eventWithDeduction as EventWithFailedDeduction);
      }
      return this._messagingService
        .sendMessage(eventWithDeduction)
        .then((messageUuid) => messageUuid, this.handleSendError(eventWithDeduction));
    }, this.handleDeductFromAllowanceError());
  }

  private deductFromAllowance(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent
  ): Promise<EventWithDeduction> {
    const numberOfMessagesEstimate = count(event.data.message);
    return match(event)
      .with({ eventType: 'ActionableEventFound' }, (e) =>
        this.deductCredits(e, numberOfMessagesEstimate).then((deductionResult) => ({
          event: e,
          deductionResult,
          numberOfMessagesEstimate
        }))
      )
      .with({ eventType: 'DemoReminderToBeSent' }, (e) =>
        this.creditsService
          .incrementDemoReminderCount(e.userId, this.config.demoReminderConfig.demoReminderLimit)
          .then((deductionResult) => ({
            event: e,
            deductionResult,
            numberOfMessagesEstimate
          }))
      )
      .exhaustive();
  }

  private handleDeductFromAllowanceError(): (error: unknown) => Promise<never> {
    return (error: unknown) => {
      logger.error('Failed to deduct from allowance', { error });
      return rejectWithError(error);
    };
  }

  private handleSendError(
    eventWithDeduction: EventWithSuccessfulDeduction
  ): (error: unknown) => Promise<never> {
    return (error: unknown) =>
      match(eventWithDeduction)
        .with({ event: { eventType: 'ActionableEventFound' } }, (data) =>
          this.handleActionableEventSendFailure(data.event, data.deductionResult)(error)
        )
        .with({ event: { eventType: 'DemoReminderToBeSent' } }, (data) =>
          this.handleDemoReminderSendFailure(data.event)(error)
        )
        .exhaustive();
  }

  private handleActionableEventSendFailure(
    event: ActionableEventFoundEvent,
    creditResult: CreditDeductionSuccess<'deduct'>
  ): (error: unknown) => Promise<never> {
    return (error: unknown) => {
      const { operationDetails } = creditResult;
      return this.creditsService
        .restoreCredits(event.userId, operationDetails.quantity, operationDetails.fromBalance)
        .then(
          () => {
            logger.info('Credits restored after message send failure', {
              userId: event.userId,
              restoredCredits: operationDetails.quantity,
              balanceType: operationDetails.fromBalance
            });
            return rejectWithError(error);
          },
          (restoreError) => {
            logger.error('Failed to restore credits after message send failure', {
              userId: event.userId,
              creditsToRestore: operationDetails.quantity,
              balanceType: operationDetails.fromBalance,
              restoreError
            });
            return rejectWithError(error);
          }
        );
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

  private processAllowanceFailure(eventWithDeduction: EventWithFailedDeduction): Promise<Uuid> {
    return match(eventWithDeduction)
      .with({ event: { eventType: 'ActionableEventFound' } }, ({ event, deductionResult }) => {
        return match(deductionResult)
          .with({ result: 'InsufficientCredits' }, (insufficientResult) => {
            logger.info('Message not sent due to insufficient credits', {
              result: insufficientResult
            });
            return this.publishInsufficientCreditErrorEvent(event, insufficientResult).then(
              () => 'insufficient-credits' as Uuid
            );
          })
          .with({ result: 'BadRequestError' }, (badRequestResult) => {
            return rejectWithMessageAndError(
              'A message could not be sent due to a bad request during credit deduction',
              badRequestResult.error
            );
          })
          .with({ result: 'UnknownError' }, (unknownErrorResult) => {
            return rejectWithMessageAndError(
              'A message could not be sent due to an unknown issue during credit deduction',
              unknownErrorResult.error
            );
          })
          .exhaustive();
      })
      .with({ event: { eventType: 'DemoReminderToBeSent' } }, ({ event, deductionResult }) => {
        return match(deductionResult)
          .with({ result: 'DemoCounterLimitReachedError' }, (demoLimitResult) => {
            logger.info('Demo reminder not sent due to demo limit reached', {
              result: demoLimitResult
            });
            return this.publishDemoLimitReachedErrorEvent(event, demoLimitResult).then(
              () => 'demo-limit-reached' as Uuid
            );
          })
          .with({ result: 'UnknownError' }, (unknownErrorResult) => {
            return rejectWithMessageAndError(
              'A message could not be sent due to an unknown issue during demo counter increment',
              unknownErrorResult.error
            );
          })
          .exhaustive();
      })
      .exhaustive();
  }

  private deductCredits(
    event: ActionableEventFoundEvent,
    estimatedMessageCount: ReturnType<typeof count>
  ): Promise<CreditDeductionResult<'deduct'>> {
    // TODO: stop assuming Spain for SMS cost and work it out based on receiver's dial code
    const creditToDeductPerUnit = this.config.countryToSMSCostCreditsMap['ES'];
    const totalCreditsToDeduct = creditToDeductPerUnit * estimatedMessageCount.messages;
    return this.creditsService.deductCredits(event.userId, totalCreditsToDeduct).then(
      tap((result) => {
        logger.info(`Number of SMSs charged: ${estimatedMessageCount.messages}`, {
          estimatedMessageCount,
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
    result: CreditDeductionSuccess<'deduct'>,
    totalCreditsToDeduct: number
  ): Promise<CreditDeductionResult<'deduct'>> {
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
