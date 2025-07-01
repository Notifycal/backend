export const tierIds = ['good', 'better', 'best'] as const;
export type TierId = (typeof tierIds)[number];
export interface Tier {
  type: 'tier';
  id: TierId;
  priceId: string;
  credits: number;
}
export type TierMap = Record<TierId, Tier>;

export const topupIds = ['single'] as const;
export type TopupId = (typeof topupIds)[number];
export interface Topup {
  type: 'topup';
  id: TopupId;
  priceId: string;
  credits: number;
}
export type TopupMap = Record<TopupId, Topup>;
