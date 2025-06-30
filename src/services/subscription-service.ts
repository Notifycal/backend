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
    const _remainingPeriodPercentage = remainingPeriodPercentage(period, at);
    const creditsToAdd = calculateUpgradeCredits(
      previousTier,
      currentTier,
      _remainingPeriodPercentage,
      this.tierToCreditsMap
    );
    logger.info('Upgrade details', {
      period,
      at,
      atInISO: DateTime.fromSeconds(at).toISO(),
      previousTier,
      currentTier,
      _remainingPeriodPercenage: _remainingPeriodPercentage,
      creditsToAdd
    });
    if (_remainingPeriodPercentage <= 0 || _remainingPeriodPercentage >= 100) {
      return Promise.resolve({
        success: false,
        operationId: 'UnknownError',
        error: new Error(
          `There is not billing cycle remaining. Most likely 'at' was out of boudaries of 'period'. Resulting percentage: ${_remainingPeriodPercentage}`
        )
      });
    }

    if (creditsToAdd <= 0) {
      return Promise.resolve({
        success: false,
        operationId: 'UnknownError',
        error: new Error('Inadvertent downgrade while doing an upgrade')
      });
    }

    return this.creditsService.addSubscriptionCredits(userId, creditsToAdd, currentTier);
  }

  public downgrade(userId: UserId): Promise<void> {
    logger.info('Downgrade scheduled. Nothing to do', { userId });
    return Promise.resolve();
  }

  public cancel(userId: UserId, reason: 'unpaid' | 'cancelled'): Promise<CreditDeductionResult> {
    return this.creditsService.clearSubscriptionCredits(userId, reason);
  }
}
