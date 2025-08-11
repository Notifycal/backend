import { logger } from '@common/powertools';
import * as SubscriptionEvents from '@model/app-events/subscription-events';
import type { IdpName, Percentage, TierId, UserIdentity } from '@notifycal/shared/types';
import type { CreditsService } from './credits-service';
import type { SnsService } from './sns';

import type { Logger } from '@aws-lambda-powertools/logger';
import type { CreditAdditionResult, CreditDeductionResult } from '@model/Credits';
import { extractErrorMessage, handleServiceOperation } from './common/error-handling';

export function calculateUpgradeCredits(
  currentTier: TierId,
  currentPlanPaidPercentage: Percentage,
  tierToCreditsMap: Record<TierId, number>
): number {
  const currentPlan = tierToCreditsMap[currentTier];
  return Math.ceil(currentPlan * (currentPlanPaidPercentage / 100));
}

export class SubscriptionService<TIdpName extends IdpName> {
  public constructor(
    private readonly creditsService: CreditsService<TIdpName>,
    private readonly tierToCreditsMap: Record<TierId, number>,
    private readonly snsService: SnsService,
    private readonly logger: Logger
  ) {}

  public create(
    userIdentity: UserIdentity<TIdpName>,
    tier: TierId
  ): Promise<CreditAdditionResult<'reset'>> {
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
        SubscriptionEvents.subscriptionCreationFailedEvent(
          userIdentity,
          tier,
          result,
          extractErrorMessage(error)
        ),
      'creating a subscription',
      this.snsService,
      this.logger
    );
  }

  public renew(
    userIdentity: UserIdentity<TIdpName>,
    tier: TierId
  ): Promise<CreditAdditionResult<'reset'>> {
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
        SubscriptionEvents.subscriptionRenewalFailedEvent(
          userIdentity,
          tier,
          result,
          extractErrorMessage(error)
        ),
      'renewing a subscription',
      this.snsService,
      this.logger
    );
  }

  public upgrade(
    userIdentity: UserIdentity<TIdpName>,
    previousTier: TierId,
    currentTier: TierId,
    currentPlanPaidPercentage: Percentage
  ): Promise<CreditAdditionResult<'add'>> {
    const creditsToAdd = calculateUpgradeCredits(
      currentTier,
      currentPlanPaidPercentage,
      this.tierToCreditsMap
    );
    logger.info('Upgrade details', {
      previousTier,
      currentTier,
      currentPlanPaidPercentage,
      creditsToAdd
    });
    if (currentPlanPaidPercentage < 0 || currentPlanPaidPercentage > 100) {
      const result = {
        success: false as const,
        result: 'UnknownError' as const,
        error: new Error(`Invalid remaining percentage: ${currentPlanPaidPercentage}`)
      };
      return this.snsService
        .safePublish(
          SubscriptionEvents.subscriptionUpgradeFailedEvent(
            userIdentity,
            previousTier,
            currentTier,
            currentPlanPaidPercentage,
            0,
            result,
            extractErrorMessage(result.error)
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
            currentPlanPaidPercentage,
            0,
            result,
            extractErrorMessage(result.error)
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
          currentPlanPaidPercentage,
          creditsToAdd,
          result
        ),
      (result, error) =>
        SubscriptionEvents.subscriptionUpgradeFailedEvent(
          userIdentity,
          previousTier,
          currentTier,
          currentPlanPaidPercentage,
          creditsToAdd,
          result,
          extractErrorMessage(error)
        ),
      'upgrading a subscription',
      this.snsService,
      this.logger
    );
  }

  public scheduleDowngrade(
    userIdentity: UserIdentity<TIdpName>,
    tiers: { current: TierId; next: TierId }
  ): Promise<void> {
    logger.info('Downgrade scheduled. Nothing to do. Credits will be reset on next cycle', {
      userId: userIdentity.userId,
      tiers
    });

    return this.snsService.safePublish(
      SubscriptionEvents.subscriptionDowngradeScheduledEvent(userIdentity, tiers)
    );
  }

  public cancel(
    userIdentity: UserIdentity<TIdpName>,
    reason: 'unpaid' | 'cancelled'
  ): Promise<CreditDeductionResult<'clear'>> {
    const operation = this.creditsService.clearSubscriptionCredits(userIdentity.userId, reason);

    return handleServiceOperation(
      operation,
      (result) => SubscriptionEvents.subscriptionCancelledEvent(userIdentity, reason, result),
      (result, error) =>
        SubscriptionEvents.subscriptionCancellationFailedEvent(
          userIdentity,
          reason,
          result,
          extractErrorMessage(error)
        ),
      `cancelling a subscription with reason '${reason}'`,
      this.snsService,
      this.logger
    );
  }
}
