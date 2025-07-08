import type { Logger } from '@aws-lambda-powertools/logger';
import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import {
  actionableEventReminderAttemptSent,
  type ActionableEventReminderAttemptSentEvent
} from '@model/app-events/ActionableEventReminderAttemptSentEvent';
import {
  actionableEventReminderInsufficientCreditNotSent,
  type ActionableEventReminderInsufficientCreditNotSentEvent
} from '@model/app-events/ActionableEventReminderInsufficientCreditNotSentEvent';
import {
  demoReminderLimitReachedNotSent,
  type DemoReminderLimitReachedNotSentEvent
} from '@model/app-events/DemoReminderLimitReachedNotSentEvent';
import {
  demoReminderToBeSentAttemptSent,
  type DemoReminderToBeSentAttemptSentEvent
} from '@model/app-events/DemoReminderToBeSentAttemptSentEvent';
import type { DemoReminderToBeSentEvent } from '@model/app-events/DemoReminderToBeSentEvent';
import type { CreditServiceEndpointConfig, DemoReminderEndpointConfig } from '@model/Config';
import type { VonageEndpointConfig } from '@model/vendor/vonage/config';
import type { IdpName, UserId, Uuid } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import type {
  CreditDeductionInsufficientCreditsError,
  CreditDeductionResult,
  CreditOperationResult,
  CreditsService,
  DemoCounterLimitReachedError
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
    private readonly config: VonageEndpointConfig &
      CreditServiceEndpointConfig &
      DemoReminderEndpointConfig,
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

  public async process(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent
  ): Promise<Uuid> {
    const { message, senderDetails, receiverDetails } = event.data;
    logger.appendKeys({
      reminderMessage: message,
      senderDetails,
      receiverDetails
    });

    return this.deductFromAllowance(event).then((allowanceResult) => {
      if (!allowanceResult.success) {
        return this.processAllowanceFailure(allowanceResult, event);
      }
      return this.sendMessage(event);
    });
  }

  private deductFromAllowance(
    event: ActionableEventFoundEvent | DemoReminderToBeSentEvent
  ): Promise<CreditOperationResult> {
    return match(event)
      .with({ eventType: 'ActionableEventFound' }, (e) =>
        this.deductCredits(e.userId, e.data.message)
      )
      .with({ eventType: 'DemoReminderToBeSent' }, (e) =>
        this.creditsService.incrementDemoReminderCount(
          e.userId,
          this.config.demoReminderConfig.demoReminderLimit
        )
      )
      .exhaustive();
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
      .with({ operationId: 'InsufficientCredits' }, (insufficientResult) => {
        logger.info('Message not sent due to insufficient credits', { result });
        return this.publishInsufficientCreditErrorEvent(
          event as ActionableEventFoundEvent,
          insufficientResult as CreditDeductionInsufficientCreditsError
        ).then(() => 'insufficient-credits' as Uuid);
      })
      .with({ operationId: 'DemoCounterLimitReachedError' }, (demoLimitResult) => {
        logger.info('Demo reminder not sent due to demo limit reached', { result });
        return this.publishDemoLimitReachedErrorEvent(
          event as DemoReminderToBeSentEvent,
          demoLimitResult as DemoCounterLimitReachedError
        ).then(() => 'demo-limit-reached' as Uuid);
      })
      .with({ operationId: 'BadRequestError' }, () => {
        const operationType =
          event.eventType === 'ActionableEventFound'
            ? 'credit deduction'
            : 'demo counter increment';
        return Promise.reject(
          new Error(`A message could not be sent due to a bad request during ${operationType}`, {
            cause: result.error
          })
        );
      })
      .with({ operationId: 'UnknownError' }, () => {
        const operationType =
          event.eventType === 'ActionableEventFound'
            ? 'credit deduction'
            : 'demo counter increment';
        return Promise.reject(
          new Error(`A message could not be sent due to an unknown issue during ${operationType}`, {
            cause: result.error
          })
        );
      })
      .exhaustive();
  }

  private deductCredits(userId: UserId, message: string): Promise<CreditDeductionResult> {
    const countResult = count(message);
    const creditToDeductPerUnit = this.config.countryToSMSCostCreditsMap['ES'];
    const totalCreditsToDeduct = creditToDeductPerUnit * countResult.messages;
    return this.creditsService.deductCredits(userId, totalCreditsToDeduct).then(
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
    const insufficientCreditEvent = actionableEventReminderInsufficientCreditNotSent(
      event,
      creditError
    );
    return this.snsService.safePublish<
      ActionableEventReminderInsufficientCreditNotSentEvent | DemoReminderLimitReachedNotSentEvent
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
      ActionableEventReminderInsufficientCreditNotSentEvent | DemoReminderLimitReachedNotSentEvent
    >(demoLimitEvent);
  }
}
