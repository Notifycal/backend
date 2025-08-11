import { tierIdSchemas } from '@lambdas/api/post-payment-session/schemas';
import type { IdpName, TierId, UserIdentity } from '@notifycal/shared/types';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const subscriptionDowngradeScheduledEventDataSchema = z.object({
  tiers: z.object({
    current: tierIdSchemas,
    next: tierIdSchemas
  })
});

export const subscriptionDowngradeScheduledEventSchema = eventSchemaGenerator(
  'SubscriptionDowngradeScheduled',
  subscriptionDowngradeScheduledEventDataSchema
);

export type SubscriptionDowngradeScheduledEventData = z.infer<
  typeof subscriptionDowngradeScheduledEventDataSchema
>;
export type SubscriptionDowngradeScheduledEvent = z.infer<
  typeof subscriptionDowngradeScheduledEventSchema
>;

export function subscriptionDowngradeScheduledEvent<TIdpName extends IdpName>(
  userIdentity: UserIdentity<TIdpName>,
  tiers: { current: TierId; next: TierId }
): SubscriptionDowngradeScheduledEvent {
  return {
    ...createEventBase('SubscriptionDowngradeScheduled', userIdentity),
    data: {
      tiers
    }
  };
}
