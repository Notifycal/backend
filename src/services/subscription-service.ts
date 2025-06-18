import type { TierId } from '@model/PaymentPlans';
import type { IdpName, UserId } from '@notifycal/shared/types';
import type { CreditAdditionResult, CreditsService } from './credits-service';

export class SubscriptionService<TIdpName extends IdpName> {
  public constructor(
    private readonly creditsService: CreditsService<TIdpName>,
    private readonly tierToCreditsMap: Record<TierId, number>
  ) {}

  public async createSubscription(userId: UserId, tier: TierId): Promise<CreditAdditionResult> {
    const credits = this.tierToCreditsMap[tier];
    return this.creditsService.resetSubscriptionCredits(userId, credits);
  }

  public async renewSubscription(userId: UserId, tier: TierId): Promise<CreditAdditionResult> {
    const credits = this.tierToCreditsMap[tier];
    return this.creditsService.resetSubscriptionCredits(userId, credits);
  }
}
