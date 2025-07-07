import type { Identity, IdpName } from '@notifycal/shared/types';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const subscriptionDowngradeScheduledEventDataSchema = z.object({});

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
  identity: Identity<TIdpName>
): SubscriptionDowngradeScheduledEvent {
  return {
    ...createEventBase('SubscriptionDowngradeScheduled', identity),
    data: {}
  };
}
