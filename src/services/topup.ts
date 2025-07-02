import type { IdpName, TopupId, UserId } from '@notifycal/shared/types';
import type { CreditAdditionResult, CreditsService } from './credits-service';

export class TopupService<TIdpName extends IdpName> {
  public constructor(
    private readonly creditsService: CreditsService<TIdpName>,
    private readonly topupToCreditsMap: Record<TopupId, number>
  ) {}
  public add(userId: UserId, topup: TopupId, quantity: number): Promise<CreditAdditionResult> {
    if (quantity < 1) {
      return Promise.reject(
        new Error(
          `Error while adding a topup. Quantity cannot be smaller than 1. Quantity: ${quantity}`
        )
      );
    }
    const credits = this.topupToCreditsMap[topup] * quantity;
    return this.creditsService.addCredits(userId, credits, {
      type: 'topup',
      id: 'single'
    });
  }
}
