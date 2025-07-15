import type { CreditAdditionResult } from '@model/Credits';
import type { IdpName, Percentage, TierId, UserIdentity } from '@notifycal/shared/types';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const subscriptionUpgradedEventDataSchema = z.object({}).passthrough();

export const subscriptionUpgradedEventSchema = eventSchemaGenerator(
  'SubscriptionUpgraded',
  subscriptionUpgradedEventDataSchema
);

export type SubscriptionUpgradedEventData = z.infer<typeof subscriptionUpgradedEventDataSchema>;
export type SubscriptionUpgradedEvent = z.infer<typeof subscriptionUpgradedEventSchema>;

export function subscriptionUpgradedEvent<TIdpName extends IdpName>(
  userIdentity: UserIdentity<TIdpName>,
  previousTier: TierId,
  currentTier: TierId,
  remainingPercentage: Percentage,
  creditsAdded: number,
  result: CreditAdditionResult<'add'>
): SubscriptionUpgradedEvent {
  return {
    ...createEventBase('SubscriptionUpgraded', userIdentity),
    data: {
      previousTier,
      currentTier,
      remainingPercentage,
      creditsAdded,
      result
    }
  };
}
