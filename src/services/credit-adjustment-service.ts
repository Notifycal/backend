import type { Logger } from '@aws-lambda-powertools/logger';
import type { WebhookCorrelationData } from '@lambdas/api/post-event-reminder-delivery-status-webhook/schema';
import type { CountryToSMSCostCreditsMap } from '@model/Config';
import type {
  CreditAdditionResult,
  CreditDeductionSuccess,
  DemoCounterDecrementResult
} from '@model/Credits';
import type { VonageWebhookMessageStatusPayload } from '@model/vendor/vonage/schemas';
import { isTransientError } from '@model/vendor/vonage/utils';
import type { IdpName, UserId } from '@notifycal/shared/types';
import { match } from 'ts-pattern';
import type { CreditsService } from './credits-service';

type CreditAdjustmentReason =
  | undefined
  | { type: 'vonageError' }
  | { type: 'creditOvercharge'; creditsDifference: number }
  | { type: 'creditUndercharge'; creditsDifference: number };

export interface CreditAdjustmentResult {
  creditRestoreResult?: CreditAdditionResult<'restore'>;
  demoCounterDecrementResult?: DemoCounterDecrementResult;
}

export class CreditAdjustmentService<TIdpName extends IdpName> {
  public constructor(
    private readonly countryToSMSCostCreditsMap: CountryToSMSCostCreditsMap,
    private readonly creditsService: CreditsService<TIdpName>,
    private readonly logger: Logger
  ) {}

  public processWebhookAdjustment(
    webhookData: WebhookCorrelationData,
    vonageStatus: VonageWebhookMessageStatusPayload
  ): Promise<CreditAdjustmentResult> {
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
    const { userId } = webhookData.originalEvent;

    return match(webhookData.originalEvent)
      .with({ eventType: 'ActionableEventFound' }, () => {
        if (
          !webhookData.creditDeductionResult ||
          !('operationDetails' in webhookData.creditDeductionResult)
        ) {
          this.logger.error(
            'Credit deduction result is required for ActionableEventFound and must be successful'
          );
          return Promise.resolve({});
        }

        return this.processAdjustment(
          userId,
          vonageStatus,
          actualMessageCount,
          estimatedMessageCount,
          this.countryToSMSCostCreditsMap,
          'ActionableEventFound',
          webhookData.creditDeductionResult
        );
      })
      .with({ eventType: 'DemoReminderToBeSent' }, () => {
        return this.processAdjustment(
          userId,
          vonageStatus,
          actualMessageCount,
          estimatedMessageCount,
          this.countryToSMSCostCreditsMap,
          'DemoReminderToBeSent'
        );
      })
      .exhaustive();
  }

  private processAdjustment(
    userId: UserId,
    vonageStatus: VonageWebhookMessageStatusPayload,
    actualMessageCount: number,
    estimatedMessageCount: number,
    countryToSMSCostCreditsMap: CountryToSMSCostCreditsMap,
    eventType: 'ActionableEventFound' | 'DemoReminderToBeSent',
    creditDeductionResult?: CreditDeductionSuccess<'deduct'>
  ): Promise<CreditAdjustmentResult> {
    if (vonageStatus.channel === 'rcs') {
      this.logger.info('RCS message status received. No credit adjustments needed.', {
        vonageStatus: vonageStatus.status,
        messageUuid: vonageStatus.message_uuid
      });
      return Promise.resolve({});
    }

    // TODO: stop assuming Spain for SMS cost and work it out based on receiver's dial code
    const creditsPerMessage = countryToSMSCostCreditsMap['ES'];

    const adjustmentReason = this.determineCreditAdjustmentReason(
      vonageStatus,
      actualMessageCount,
      estimatedMessageCount,
      creditsPerMessage
    );

    if (!adjustmentReason) {
      this.logger.info('No need to adjust credits or demo counter for this message status', {
        vonageStatus: vonageStatus.status,
        vonageError: vonageStatus.error,
        messageUuid: vonageStatus.message_uuid,
        actualMessageCount,
        estimatedMessageCount,
        adjustmentReason
      });
      return Promise.resolve({});
    }

    return match(eventType)
      .with('ActionableEventFound', () => {
        if (!creditDeductionResult) {
          this.logger.error('Credit deduction result is required for ActionableEventFound');
          return Promise.resolve({});
        }

        return this.handleActionableEventCreditAdjustment(
          userId,
          adjustmentReason,
          creditDeductionResult
        );
      })
      .with('DemoReminderToBeSent', () => {
        // For demo reminders, we only process on Vonage errors or overcharges
        if (
          adjustmentReason.type === 'vonageError' ||
          adjustmentReason.type === 'creditOvercharge'
        ) {
          return this.handleDemoReminderAdjustment(userId);
        }

        this.logger.info('No demo reminder adjustment needed for undercharge', {
          adjustmentReason
        });
        return Promise.resolve({});
      })
      .exhaustive();
  }

  private determineCreditAdjustmentReason(
    vonageStatus: VonageWebhookMessageStatusPayload,
    actualMessageCount: number,
    estimatedMessageCount: number,
    creditsPerMessage: number
  ): CreditAdjustmentReason {
    const hasTransientError = isTransientError(vonageStatus);
    if (hasTransientError) {
      return { type: 'vonageError' };
    }
    const messageDifference = actualMessageCount - estimatedMessageCount;
    if (messageDifference === 0) {
      return undefined;
    }
    const creditsDifference = Math.abs(messageDifference * creditsPerMessage);
    if (messageDifference > 0) {
      return { type: 'creditOvercharge', creditsDifference };
    }
    return { type: 'creditUndercharge', creditsDifference };
  }

  private handleActionableEventCreditAdjustment(
    userId: UserId,
    adjustmentReason: CreditAdjustmentReason,
    creditDeductionResult: CreditDeductionSuccess<'deduct'>
  ): Promise<{ creditRestoreResult?: CreditAdditionResult<'restore'> }> {
    const { fromBalance, quantity } = creditDeductionResult.operationDetails;

    return match(adjustmentReason)
      .with(undefined, () => {
        this.logger.info(
          'No credit adjustment needed. Exact match between estimated and actual number of messages'
        );
        return Promise.resolve({});
      })
      .with({ type: 'vonageError' }, () => {
        // For Vonage errors, we restore credits based on the original deduction
        // This is a transient error, so we give back what we charged
        return this.creditsService
          .restoreCredits(userId, quantity, fromBalance)
          .then((creditRestoreResult) => {
            this.logger.info('Credits deducted originally restored due to Vonage transient error', {
              quantity,
              fromBalance
            });

            return { creditRestoreResult };
          });
      })
      .with({ type: 'creditUndercharge' }, ({ creditsDifference }) => {
        this.logger.info('User was undercharged. You are welcome', {
          creditsDifference
        });
        return Promise.resolve({});
      })
      .with({ type: 'creditOvercharge' }, ({ creditsDifference }) => {
        return this.creditsService
          .restoreCredits(userId, creditsDifference, fromBalance)
          .then((creditRestoreResult) => {
            this.logger.info('Credits restored due to overcharge', {
              creditsDifference,
              fromBalance
            });

            return { creditRestoreResult };
          });
      })
      .exhaustive();
  }

  private async handleDemoReminderAdjustment(
    userId: UserId
  ): Promise<{ demoCounterDecrementResult?: DemoCounterDecrementResult }> {
    this.logger.info('Demo reminder counter is going to be decremented due to message failure', {
      userId
    });
    return this.creditsService
      .decrementDemoReminderCount(userId)
      .then((demoCounterDecrementResult) => ({ demoCounterDecrementResult }));
  }
}
