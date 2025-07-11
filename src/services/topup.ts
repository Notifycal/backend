import { topupFailedEvent } from '@model/app-events/TopupFailedEvent';
import { topupSucceededEvent } from '@model/app-events/TopupSucceededEvent';
import type { CreditAdditionResult } from '@model/Credits';
import type { IdpName, TopupId, UserIdentity } from '@notifycal/shared/types';
import { handleServiceOperation } from './common/error-handling';
import type { CreditsService } from './credits-service';
import type { SnsService } from './sns';

export class TopupService<TIdpName extends IdpName> {
  public constructor(
    private readonly creditsService: CreditsService<TIdpName>,
    private readonly topupToCreditsMap: Record<TopupId, number>,
    private readonly snsService: SnsService
  ) {}
  public add(
    identity: UserIdentity<TIdpName>,
    topup: TopupId,
    quantity: number
  ): Promise<CreditAdditionResult> {
    if (quantity < 1) {
      const error = new Error(
        `Error while adding a topup. Quantity cannot be smaller than 1. Quantity: ${quantity}`
      );
      return this.snsService
        .safePublish(topupFailedEvent(identity, topup, quantity, 0, undefined, error))
        .then(() => Promise.reject(error));
    }
    const credits = this.topupToCreditsMap[topup] * quantity;
    const operation = this.creditsService.addCredits(identity.userId, credits, {
      type: 'topup',
      id: 'single'
    });

    return handleServiceOperation(
      operation,
      (result) => topupSucceededEvent(identity, topup, quantity, credits, result),
      (result, error) => topupFailedEvent(identity, topup, quantity, credits, result, error),
      this.snsService
    );
  }
}
