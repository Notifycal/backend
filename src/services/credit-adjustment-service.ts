import type { Logger } from '@aws-lambda-powertools/logger';
import type { WebhookCorrelationData } from '@lambdas/api/post-event-reminder-delivery-status-webhook/schema';
import { creditsAdjustedEvent } from '@model/app-events/CreditsAdjustedEvent';
import type { CountryToSMSCostCreditsMap } from '@model/Config';
import type {
  CreditAdditionResult,
  CreditDeductionResult,
  CreditDeductionSuccess,
  DemoCounterDecrementResult
} from '@model/Credits';
import { categorizeError } from '@model/vendor/vonage/errors';
import type { VonageWebhookMessageStatusPayload } from '@model/vendor/vonage/schemas';
import type { IdpName, UserId } from '@notifycal/shared/types';
import { tap } from '@utils/promises';
import { match, P } from 'ts-pattern';
import type { CreditsService } from './credits-service';
import type { SnsService } from './sns';

type CreditAdjustmentReason =
  | { type: 'noUsersFaultError' }
  | { type: 'creditOvercharge'; creditsDifference: number; messageDifference: number }
  | { type: 'creditUndercharge'; creditsDifference: number; messageDifference: number };

export interface CreditAdjustmentResult {
  creditAdjustmentResult?: CreditAdditionResult<'restore'> | CreditDeductionResult<'deduct'>;
  demoCounterAdjustmentResult?: DemoCounterDecrementResult;
}

export class CreditAdjustmentService<TIdpName extends IdpName> {
  public constructor(
    private readonly countryToSMSCostCreditsMap: CountryToSMSCostCreditsMap,
    private readonly creditsService: CreditsService<TIdpName>,
    private readonly snsService: SnsService,
    private readonly logger: Logger
  ) {}

  public processWebhookAdjustment(
    webhookData: WebhookCorrelationData,
    vonageStatus: VonageWebhookMessageStatusPayload
  ): Promise<CreditAdjustmentResult> {
    if (vonageStatus.channel === 'rcs') {
      this.logger.info('RCS message status received. No credit adjustments needed.', {
        vonageStatus: vonageStatus.status,
        messageUuid: vonageStatus.message_uuid
      });
      return Promise.resolve({});
    }
    const actualMessageCount =
      vonageStatus.channel === 'sms' ? vonageStatus.sms?.count_total : undefined;
    if (!actualMessageCount) {
      this.logger.error('No message count found in Vonage status. Skipping credit adjustments', {
        vonageStatus: vonageStatus.status,
        messageUuid: vonageStatus.message_uuid
      });
      return Promise.resolve({});
    }
    const estimatedMessageCount = webhookData.estimatedMessageCount.messages;
    // TODO: stop assuming Spain for SMS cost and work it out based on receiver's dial code
    const creditsPerMessage = this.countryToSMSCostCreditsMap['ES'];

    const adjustmentReason = this.determineCreditAdjustmentReason(
      vonageStatus,
      actualMessageCount,
      estimatedMessageCount,
      creditsPerMessage
    );

    if (!adjustmentReason) {
      this.logger.info('No need to adjust credits or demo counter for this message status', {
        vonageStatus: vonageStatus.status,
        noUsersFaultError: vonageStatus.error,
        messageUuid: vonageStatus.message_uuid,
        actualMessageCount,
        estimatedMessageCount,
        adjustmentReason
      });
      return Promise.resolve({});
    }

    return this.doAdjustment(webhookData, adjustmentReason);
  }

  private doAdjustment(
    webhookData: WebhookCorrelationData,
    adjustmentReason: CreditAdjustmentReason
  ): Promise<CreditAdjustmentResult> {
    const { userId } = webhookData.originalEvent;
    return match(webhookData)
      .with({ originalEvent: { eventType: 'ActionableEventFound' } }, (_webhookData) => {
        return this.doActionableEventCreditAdjustment(
          userId,
          adjustmentReason,
          _webhookData.creditDeductionResult,
          _webhookData.originalEvent
        );
      })
      .with({ originalEvent: { eventType: 'DemoReminderToBeSent' } }, () => {
        return this.doDemoReminderAdjustment(userId, adjustmentReason);
      })
      .exhaustive();
  }

  private determineCreditAdjustmentReason(
    vonageStatus: VonageWebhookMessageStatusPayload,
    actualMessageCount: number,
    estimatedMessageCount: number,
    creditsPerMessage: number
  ): CreditAdjustmentReason | undefined {
    const errorCategory = categorizeError(vonageStatus);
    if (['notifycal', 'vonage', 'transient', 'unknown'].includes(errorCategory)) {
      this.logger.error(
        `Vonage has notified us of an error that we interpreted as reimbursable. We are potentially losing money`
      );
      return { type: 'noUsersFaultError' };
    }
    const messageDifference = actualMessageCount - estimatedMessageCount;
    if (messageDifference === 0) {
      return undefined;
    }
    const creditsDifference = Math.abs(messageDifference * creditsPerMessage);
    if (messageDifference > 0) {
      return { type: 'creditOvercharge', creditsDifference, messageDifference };
    }
    return { type: 'creditUndercharge', creditsDifference, messageDifference };
  }

  private doActionableEventCreditAdjustment(
    userId: UserId,
    adjustmentReason: CreditAdjustmentReason,
    creditDeductionResult: CreditDeductionSuccess<'deduct'>,
    originalEvent: WebhookCorrelationData['originalEvent']
  ): Promise<CreditAdjustmentResult> {
    const { fromBalance, quantity } = creditDeductionResult.operationDetails;
    return match(adjustmentReason)
      .with({ type: 'noUsersFaultError' }, () => {
        return this.creditsService
          .restoreCredits(userId, quantity, fromBalance)
          .then(
            tap((creditRestoreResult) => {
              this.logger.info(
                'All credits deducted originally restored due to Vonage transient error',
                {
                  quantity,
                  fromBalance
                }
              );
              return this.publishCreditsAdjusted(originalEvent, creditRestoreResult);
            })
          )
          .then((creditRestoreResult) => ({ creditAdjustmentResult: creditRestoreResult }));
      })
      .with({ type: 'creditUndercharge' }, ({ creditsDifference, messageDifference }) => {
        return this.creditsService
          .deductCredits(userId, creditsDifference)
          .then(
            tap((creditDeductionResult) => {
              this.logger.info('Credits deducted due to undercharge', {
                creditsDifference,
                messageDifference,
                fromBalance
              });
              return this.publishCreditsAdjusted(originalEvent, undefined, creditDeductionResult);
            })
          )
          .then((creditDeductionResult) => ({ creditAdjustmentResult: creditDeductionResult }));
      })
      .with({ type: 'creditOvercharge' }, ({ creditsDifference, messageDifference }) => {
        return this.creditsService
          .restoreCredits(userId, creditsDifference, fromBalance)
          .then(
            tap((creditRestoreResult) => {
              this.logger.info('Credits restored due to overcharge', {
                creditsDifference,
                messageDifference,
                fromBalance
              });
              return this.publishCreditsAdjusted(originalEvent, creditRestoreResult);
            })
          )
          .then((creditRestoreResult) => ({ creditAdjustmentResult: creditRestoreResult }));
      })
      .exhaustive();
  }

  private publishCreditsAdjusted(
    originalEvent: WebhookCorrelationData['originalEvent'],
    creditRestoreResult?: CreditAdditionResult<'restore'>,
    creditDeductionResult?: CreditDeductionResult<'deduct'>
  ): Promise<void> {
    const { userId: originalUserId, idp, idpId } = originalEvent;
    const adjustedEvent = creditsAdjustedEvent(
      { userId: originalUserId, idp, idpId },
      creditRestoreResult,
      creditDeductionResult
    );
    return this.snsService.safePublish(adjustedEvent).catch((error) => {
      this.logger.warn('Failed to publish CreditsAdjusted event', { error, adjustedEvent });
    });
  }

  private async doDemoReminderAdjustment(
    userId: UserId,
    adjustmentReason: CreditAdjustmentReason
  ): Promise<CreditAdjustmentResult> {
    return match(adjustmentReason)
      .with({ type: P.union('noUsersFaultError', 'creditOvercharge') }, () => {
        this.logger.info(
          'Demo reminder counter is going to be decremented due to message failure',
          {
            userId
          }
        );
        return this.creditsService
          .decrementDemoReminderCount(userId)
          .then((demoCounterDecrementResult) => ({
            demoCounterAdjustmentResult: demoCounterDecrementResult
          }));
      })
      .with({ type: 'creditUndercharge' }, ({ creditsDifference, messageDifference }) => {
        this.logger.info('No demo reminder adjustment needed for undercharge', {
          adjustmentReason,
          creditsDifference,
          messageDifference
        });
        return Promise.resolve({});
      })
      .exhaustive();
  }
}
