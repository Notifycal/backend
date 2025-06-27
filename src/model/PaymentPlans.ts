const tierIds = ['good', 'better', 'best'] as const;
export const tierIdMap = Object.fromEntries(tierIds.map((tier) => [tier, tier])) as Record<
  (typeof tierIds)[number],
  (typeof tierIds)[number]
>;
export type TierId = (typeof tierIds)[number];
export interface Tier {
  type: 'tier';
  id: TierId;
  priceId: string;
  credits: number;
}
export type Tiers = Record<TierId, Tier>;

const topupIds = ['single'] as const;
export const topupIdMap = Object.fromEntries(topupIds.map((topup) => [topup, topup])) as Record<
  (typeof topupIds)[number],
  (typeof topupIds)[number]
>;
export type TopupId = (typeof topupIds)[number];
export interface Topup {
  type: 'topup';
  id: TopupId;
  priceId: string;
  credits: number;
}
export type Topups = Record<TopupId, Topup>;
