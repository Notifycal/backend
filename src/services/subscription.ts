import { logger } from '@common/powertools';
import type { BaseErrorEvent, BaseEvent } from '@model/app-events/BaseEvent';
import { subscriptionCancellationFailedEvent } from '@model/app-events/SubscriptionCancellationFailedEvent';
import { subscriptionCancelledEvent } from '@model/app-events/SubscriptionCancelledEvent';
import { subscriptionCreatedEvent } from '@model/app-events/SubscriptionCreatedEvent';
import { subscriptionCreationFailedEvent } from '@model/app-events/SubscriptionCreationFailedEvent';
import { subscriptionDowngradeScheduledEvent } from '@model/app-events/SubscriptionDowngradeScheduledEvent';
import { subscriptionRenewalFailedEvent } from '@model/app-events/SubscriptionRenewalFailedEvent';
import { subscriptionRenewedEvent } from '@model/app-events/SubscriptionRenewedEvent';
import { subscriptionUpgradedEvent } from '@model/app-events/SubscriptionUpgradedEvent';
import { subscriptionUpgradeFailedEvent } from '@model/app-events/SubscriptionUpgradeFailedEvent';
import type { Identity, IdpName, Percentage, TierId } from '@notifycal/shared/types';
import type {
  CreditAdditionResult,
  CreditDeductionResult,
  CreditsService
} from './credits-service';
import type { SnsService } from './sns';

function handleServiceOperation<
  TResult extends CreditAdditionResult | CreditDeductionResult,
  TEvent extends BaseEvent,
  TErrorEvent extends BaseErrorEvent
>(
  operation: Promise<TResult>,
  successEventFactory: (data: TResult) => TEvent,
  failureEventFactory: (result: TResult | undefined, error: unknown) => TErrorEvent,
  snsService: SnsService
): Promise<TResult> {
  return operation
    .then((result) => {
      const isSuccess = result.success;
      return snsService
        .safePublish(
          isSuccess ? successEventFactory(result) : failureEventFactory(result, undefined)
        )
        .then(() => result);
    })
    .catch((error) => {
      return (
        snsService
          .safePublish(failureEventFactory(undefined, error))
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          .then(() => Promise.reject(error))
      );
    });
}

export function calculateUpgradeCredits(
  previousTier: TierId,
  currentTier: TierId,
  remainingCyclePercentage: Percentage,
  tierToCreditsMap: Record<TierId, number>
): number {
  const previousPlan = tierToCreditsMap[previousTier];
  const currentPlan = tierToCreditsMap[currentTier];

  const creditDifference = currentPlan - previousPlan;
  const creditsToAdd = Math.ceil(creditDifference * (remainingCyclePercentage / 100));
  return creditsToAdd;
}

export class SubscriptionService<TIdpName extends IdpName> {
  public constructor(
    private readonly creditsService: CreditsService<TIdpName>,
    private readonly tierToCreditsMap: Record<TierId, number>,
    private readonly snsService: SnsService
  ) {}

  public create(identity: Identity<TIdpName>, tier: TierId): Promise<CreditAdditionResult> {
    const credits = this.tierToCreditsMap[tier];
    const operation = this.creditsService.resetSubscriptionCredits(identity.userId, credits, tier);

    return handleServiceOperation(
      operation,
      (result) => subscriptionCreatedEvent(identity, tier, result),
      (result, error) => subscriptionCreationFailedEvent(identity, tier, result, error),
      this.snsService
    );
  }

  public renew(identity: Identity<TIdpName>, tier: TierId): Promise<CreditAdditionResult> {
    const credits = this.tierToCreditsMap[tier];
    const operation = this.creditsService.resetSubscriptionCredits(identity.userId, credits, tier);

    return handleServiceOperation(
      operation,
      (result) => subscriptionRenewedEvent(identity, tier, result),
      (result, error) => subscriptionRenewalFailedEvent(identity, tier, result, error),
      this.snsService
    );
  }

  public upgrade(
    identity: Identity<TIdpName>,
    previousTier: TierId,
    currentTier: TierId,
    remainingPercentage: Percentage
  ): Promise<CreditAdditionResult> {
    const creditsToAdd = calculateUpgradeCredits(
      previousTier,
      currentTier,
      remainingPercentage,
      this.tierToCreditsMap
    );
    logger.info('Upgrade details', {
      previousTier,
      currentTier,
      remainingPercentage,
      creditsToAdd
    });
    if (remainingPercentage < 0 || remainingPercentage > 100) {
      const result = {
        success: false as const,
        operationId: 'UnknownError' as const,
        error: new Error(`Invalid remaining percentage: ${remainingPercentage}`)
      };
      return this.snsService
        .safePublish(
          subscriptionUpgradeFailedEvent(
            identity,
            previousTier,
            currentTier,
            remainingPercentage,
            0,
            result,
            result.error
          )
        )
        .then(() => result);
    }

    if (creditsToAdd <= 0) {
      const result = {
        success: false as const,
        operationId: 'UnknownError' as const,
        error: new Error('Inadvertent credit stealing while doing an upgrade')
      };
      return this.snsService
        .safePublish(
          subscriptionUpgradeFailedEvent(
            identity,
            previousTier,
            currentTier,
            remainingPercentage,
            0,
            result,
            result.error
          )
        )
        .then(() => result);
    }

    const operation = this.creditsService.addCredits(identity.userId, creditsToAdd, {
      type: 'subscription',
      id: currentTier
    });

    return handleServiceOperation(
      operation,
      (result) =>
        subscriptionUpgradedEvent(
          identity,
          previousTier,
          currentTier,
          remainingPercentage,
          creditsToAdd,
          result
        ),
      (result, error) =>
        subscriptionUpgradeFailedEvent(
          identity,
          previousTier,
          currentTier,
          remainingPercentage,
          creditsToAdd,
          result,
          error
        ),
      this.snsService
    );
  }

  public scheduleDowngrade(identity: Identity<TIdpName>): Promise<void> {
    logger.info('Downgrade scheduled. Nothing to do. Credits will be reset on next cycle', {
      userId: identity.userId
    });

    return this.snsService.safePublish(subscriptionDowngradeScheduledEvent(identity));
  }

  public cancel(
    identity: Identity<TIdpName>,
    reason: 'unpaid' | 'cancelled'
  ): Promise<CreditDeductionResult> {
    const operation = this.creditsService.clearSubscriptionCredits(identity.userId, reason);

    return handleServiceOperation(
      operation,
      (result) => subscriptionCancelledEvent(identity, reason, result),
      (result, error) => subscriptionCancellationFailedEvent(identity, reason, result, error),
      this.snsService
    );
  }
}
