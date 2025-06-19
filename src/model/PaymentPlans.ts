const tierIds = ['good', 'better', 'best'] as const;

export const tierIdMap = Object.fromEntries(tierIds.map((tier) => [tier, tier])) as Record<
  (typeof tierIds)[number],
  (typeof tierIds)[number]
>;

export type TierId = (typeof tierIds)[number];

export interface Tier {
  id: TierId;
  priceId: string;
  credits: number;
}
export type Tiers = Record<TierId, Tier>;
