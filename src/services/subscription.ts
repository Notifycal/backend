import { logger } from '@common/powertools';
import * as SubscriptionEvents from '@model/app-events/subscription-events';
import type { IdpName, Percentage, TierId, UserIdentity } from '@notifycal/shared/types';
import type { CreditsService } from './credits-service';
import type { SnsService } from './sns';

import type { CreditAdditionResult, CreditDeductionResult } from '@model/Credits';
import { handleServiceOperation } from './common/error-handling';

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

  public create(userIdentity: UserIdentity<TIdpName>, tier: TierId): Promise<CreditAdditionResult> {
    const credits = this.tierToCreditsMap[tier];
    const operation = this.creditsService.resetSubscriptionCredits(
      userIdentity.userId,
      credits,
      tier
    );

    return handleServiceOperation(
      operation,
      (result) => SubscriptionEvents.subscriptionCreatedEvent(userIdentity, tier, result),
      (result, error) =>
        SubscriptionEvents.subscriptionCreationFailedEvent(userIdentity, tier, result, error),
      this.snsService
    );
  }

  public renew(userIdentity: UserIdentity<TIdpName>, tier: TierId): Promise<CreditAdditionResult> {
    const credits = this.tierToCreditsMap[tier];
    const operation = this.creditsService.resetSubscriptionCredits(
      userIdentity.userId,
      credits,
      tier
    );

    return handleServiceOperation(
      operation,
      (result) => SubscriptionEvents.subscriptionRenewedEvent(userIdentity, tier, result),
      (result, error) =>
        SubscriptionEvents.subscriptionRenewalFailedEvent(userIdentity, tier, result, error),
      this.snsService
    );
  }

  public upgrade(
    userIdentity: UserIdentity<TIdpName>,
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
        result: 'UnknownError' as const,
        error: new Error(`Invalid remaining percentage: ${remainingPercentage}`)
      };
      return this.snsService
        .safePublish(
          SubscriptionEvents.subscriptionUpgradeFailedEvent(
            userIdentity,
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
        result: 'UnknownError' as const,
        error: new Error('Inadvertent credit stealing while doing an upgrade')
      };
      return this.snsService
        .safePublish(
          SubscriptionEvents.subscriptionUpgradeFailedEvent(
            userIdentity,
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

    const operation = this.creditsService.addCredits(userIdentity.userId, creditsToAdd, {
      type: 'subscription',
      id: currentTier
    });

    return handleServiceOperation(
      operation,
      (result) =>
        SubscriptionEvents.subscriptionUpgradedEvent(
          userIdentity,
          previousTier,
          currentTier,
          remainingPercentage,
          creditsToAdd,
          result
        ),
      (result, error) =>
        SubscriptionEvents.subscriptionUpgradeFailedEvent(
          userIdentity,
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

  public scheduleDowngrade(userIdentity: UserIdentity<TIdpName>): Promise<void> {
    logger.info('Downgrade scheduled. Nothing to do. Credits will be reset on next cycle', {
      userId: userIdentity.userId
    });

    return this.snsService.safePublish(
      SubscriptionEvents.subscriptionDowngradeScheduledEvent(userIdentity)
    );
  }

  public cancel(
    userIdentity: UserIdentity<TIdpName>,
    reason: 'unpaid' | 'cancelled'
  ): Promise<CreditDeductionResult> {
    const operation = this.creditsService.clearSubscriptionCredits(userIdentity.userId, reason);

    return handleServiceOperation(
      operation,
      (result) => SubscriptionEvents.subscriptionCancelledEvent(userIdentity, reason, result),
      (result, error) =>
        SubscriptionEvents.subscriptionCancellationFailedEvent(userIdentity, reason, result, error),
      this.snsService
    );
  }
}
