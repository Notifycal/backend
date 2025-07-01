import { logger } from '@common/powertools';
import type { TierId } from '@model/PaymentPlans';
import type { IdpName, Percentage, UserId } from '@notifycal/shared/types';
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
      return Promise.resolve({
        success: false,
        operationId: 'UnknownError',
        error: new Error(`Invalid remaining percentage: ${remainingPercentage}`)
      });
    }

    if (creditsToAdd <= 0) {
      return Promise.resolve({
        success: false,
        operationId: 'UnknownError',
        error: new Error('Inadvertent credit stealing while doing an upgrade')
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
