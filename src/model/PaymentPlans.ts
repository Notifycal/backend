import type { TierId, TopupId } from '@notifycal/shared/types';

export interface Tier {
  type: 'tier';
  id: TierId;
  priceId: string;
  credits: number;
}
export type TierMap = Record<TierId, Tier>;

export interface Topup {
  type: 'topup';
  id: TopupId;
  priceId: string;
  credits: number;
}
export type TopupMap = Record<TopupId, Topup>;
