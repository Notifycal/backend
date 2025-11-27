import type { TierId, TopupId } from '@notifycal/shared/types';

export const freeTrialTierId = 'good-trial' as const;
export type FreeTrialTierId = typeof freeTrialTierId;
export interface Tier {
  type: 'tier';
  id: TierId;
  priceId: string;
  credits: number;
}
export type TierWithTrial = Omit<Tier, 'id'> & { id: TierId | FreeTrialTierId };
export type TierMap = Record<TierId, Tier>;

export interface Topup {
  type: 'topup';
  id: TopupId;
  priceId: string;
  credits: number;
}
export type TopupMap = Record<TopupId, Topup>;
