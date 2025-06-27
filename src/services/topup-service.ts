import type { TopupId } from '@model/PaymentPlans';
import type { IdpName, UserId } from '@notifycal/shared/types';
import type { CreditAdditionResult, CreditsService } from './credits-service';

export class TopupService<TIdpName extends IdpName> {
  public constructor(
    private readonly creditsService: CreditsService<TIdpName>,
    private readonly topupToCreditsMap: Record<TopupId, number>
  ) {}
  public do(userId: UserId, topup: TopupId): Promise<CreditAdditionResult> {
    const credits = this.topupToCreditsMap[topup];
    return this.creditsService.addTopupCredits(userId, credits);
  }
}
