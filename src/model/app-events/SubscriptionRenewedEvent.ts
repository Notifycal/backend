import type { CreditAdditionResult } from '@model/Credits';
import type { IdpName, TierId, UserIdentity } from '@notifycal/shared/types';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const subscriptionRenewedEventDataSchema = z.object({}).passthrough();

export const subscriptionRenewedEventSchema = eventSchemaGenerator(
  'SubscriptionRenewed',
  subscriptionRenewedEventDataSchema
);

export type SubscriptionRenewedEventData = z.infer<typeof subscriptionRenewedEventDataSchema>;
export type SubscriptionRenewedEvent = z.infer<typeof subscriptionRenewedEventSchema>;

export function subscriptionRenewedEvent<TIdpName extends IdpName>(
  identity: UserIdentity<TIdpName>,
  tier: TierId,
  result: CreditAdditionResult
): SubscriptionRenewedEvent {
  return {
    ...createEventBase('SubscriptionRenewed', identity),
    data: {
      tier,
      result
    }
  };
}
