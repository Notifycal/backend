import type { CreditAdditionResult } from '@model/Credits';
import type { IdpName, Percentage, TierId, UserIdentity } from '@notifycal/shared/types';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const subscriptionUpgradeFailedEventDataSchema = z.object({}).passthrough();

export const subscriptionUpgradeFailedEventSchema = errorEventSchemaGenerator(
  'SubscriptionUpgradeFailed',
  subscriptionUpgradeFailedEventDataSchema
);

export type SubscriptionUpgradeFailedEventData = z.infer<
  typeof subscriptionUpgradeFailedEventDataSchema
>;
export type SubscriptionUpgradeFailedEvent = z.infer<typeof subscriptionUpgradeFailedEventSchema>;

export function subscriptionUpgradeFailedEvent<TIdpName extends IdpName>(
  identity: UserIdentity<TIdpName>,
  previousTier: TierId,
  currentTier: TierId,
  remainingPercentage?: Percentage,
  creditsAdded?: number,
  result?: CreditAdditionResult,
  error?: unknown
): SubscriptionUpgradeFailedEvent {
  return {
    ...createEventBase('SubscriptionUpgradeFailed', identity),
    data: {
      previousTier,
      currentTier,
      remainingPercentage,
      creditsAdded,
      result,
      error
    }
  };
}
