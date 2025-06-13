import type { TierId } from '@model/PaymentPlans';
import type { IdpName, UserId } from '@notifycal/shared/types';
import type { UserBaseStore } from '@services/stores/user-base-store';

export class CreditsService<TIdpName extends IdpName> {
  //TODO: Move this to a config file
  private static readonly tierToCreditsMap: Record<string, number> = {
    good: 100,
    better: 250,
    best: 600
  };

  //TODO: Move this to a config file
  private static readonly countryToSMSCostCreditsMap: Record<'ES', number> = {
    ES: 7
  };

  public constructor(private readonly userStore: UserBaseStore<TIdpName>) {}

  public createSubscription(userId: UserId, tier: TierId): Promise<void> {
    const newCredits = CreditsService.tierToCreditsMap[tier];
    return this.userStore.addCredits(userId, newCredits);
  }

  public renewSubscription(userId: UserId, tier: TierId): Promise<void> {
    return this.createSubscription(userId, tier);
  }

  public async deductCredits(userId: UserId, units: number, country: 'ES'): Promise<void> {
    const credictToDeductPerUnit = CreditsService.countryToSMSCostCreditsMap[country];
    const totalCreditsToDeduct = credictToDeductPerUnit * units;
    return this.userStore.deductCredits(userId, totalCreditsToDeduct).then();
  }
}
