import type { CreditAdditionResult } from '@model/Credits';
import type { IdpName, TierId, UserIdentity } from '@notifycal/shared/types';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const subscriptionRenewalFailedEventDataSchema = z.object({}).passthrough();

export const subscriptionRenewalFailedEventSchema = errorEventSchemaGenerator(
  'SubscriptionRenewalFailed',
  subscriptionRenewalFailedEventDataSchema
);

export type SubscriptionRenewalFailedEventData = z.infer<
  typeof subscriptionRenewalFailedEventDataSchema
>;
export type SubscriptionRenewalFailedEvent = z.infer<typeof subscriptionRenewalFailedEventSchema>;

export function subscriptionRenewalFailedEvent<TIdpName extends IdpName>(
  identity: UserIdentity<TIdpName>,
  tier: TierId,
  result?: CreditAdditionResult,
  error?: unknown
): SubscriptionRenewalFailedEvent {
  return {
    ...createEventBase('SubscriptionRenewalFailed', identity),
    data: {
      tier,
      result,
      error
    }
  };
}
