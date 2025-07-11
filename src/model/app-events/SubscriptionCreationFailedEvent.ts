import type { CreditAdditionResult } from '@model/Credits';
import type { IdpName, TierId, UserIdentity } from '@notifycal/shared/types';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const subscriptionCreationFailedEventDataSchema = z.object({}).passthrough();

export const subscriptionCreationFailedEventSchema = errorEventSchemaGenerator(
  'SubscriptionCreationFailed',
  subscriptionCreationFailedEventDataSchema
);

export type SubscriptionCreationFailedEventData = z.infer<
  typeof subscriptionCreationFailedEventDataSchema
>;
export type SubscriptionCreationFailedEvent = z.infer<typeof subscriptionCreationFailedEventSchema>;

export function subscriptionCreationFailedEvent<TIdpName extends IdpName>(
  userIdentity: UserIdentity<TIdpName>,
  tier: TierId,
  result?: CreditAdditionResult,
  error?: unknown
): SubscriptionCreationFailedEvent {
  return {
    ...createEventBase('SubscriptionCreationFailed', userIdentity),
    data: {
      tier,
      result,
      error
    }
  };
}
