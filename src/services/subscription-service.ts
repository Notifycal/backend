import { logger } from '@common/powertools';
import type { TierId } from '@model/PaymentPlans';
import type { IdpName, Percentage, UnixTimestamp, UserId } from '@notifycal/shared/types';
import type { Period } from '@own-types/model';
import { remainingPeriodPercentage } from '@utils/datetime';
import { DateTime } from 'luxon';
import type {
  CreditAdditionResult,
  CreditDeductionResult,
  CreditsService
} from './credits-service';

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
    private readonly tierToCreditsMap: Record<TierId, number>
  ) {}

  public create(userId: UserId, tier: TierId): Promise<CreditAdditionResult> {
    const credits = this.tierToCreditsMap[tier];
    return this.creditsService.resetSubscriptionCredits(userId, credits, tier);
  }

  public renew(userId: UserId, tier: TierId): Promise<CreditAdditionResult> {
    const credits = this.tierToCreditsMap[tier];
    return this.creditsService.resetSubscriptionCredits(userId, credits, tier);
  }

  public upgrade(
    userId: UserId,
    previousTier: TierId,
    currentTier: TierId,
    period: Period,
    at: UnixTimestamp
  ): Promise<CreditAdditionResult> {
    const _remainingPeriodPercenage = remainingPeriodPercentage(period, at);
    if (_remainingPeriodPercenage <= 0 || _remainingPeriodPercenage >= 100) {
      return Promise.resolve({
        success: false,
        operationId: 'UnknownError',
        error: new Error(
          `There is not bylling cycle remaining. Most likely 'at' was out of boudaries of 'period'. Resulting percentage: ${_remainingPeriodPercenage}`
        )
      });
    }
    const creditsToAdd = calculateUpgradeCredits(
      previousTier,
      currentTier,
      _remainingPeriodPercenage,
      this.tierToCreditsMap
    );

    if (creditsToAdd <= 0) {
      return Promise.resolve({
        success: false,
        operationId: 'UnknownError',
        error: new Error('Inadvertent downgrade while doing an upgrade')
      });
    }

    logger.info('Upgrade details', {
      period,
      at: DateTime.fromSeconds(at).toISO(),
      previousTier,
      currentTier,
      _remainingPeriodPercenage,
      creditsToAdd
    });

    return this.creditsService.addSubscriptionCredits(userId, creditsToAdd, currentTier);
  }

  public downgrade(userId: UserId): Promise<void> {
    logger.info('Downgrade scheduled. Nothing to do', { userId });
    return Promise.resolve();
  }

  public cancel(userId: UserId, reason: 'unpaid' | 'cancelled'): Promise<CreditDeductionResult> {
    return this.creditsService.deleteSubscriptionCredits(userId, reason);
  }
}
