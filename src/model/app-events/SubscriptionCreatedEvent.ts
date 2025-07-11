import type { CreditAdditionResult } from '@model/Credits';
import type { Identity, IdpName, TierId } from '@notifycal/shared/types';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const subscriptionCreatedEventDataSchema = z.object({}).passthrough();

export const subscriptionCreatedEventSchema = eventSchemaGenerator(
  'SubscriptionCreated',
  subscriptionCreatedEventDataSchema
);

export type SubscriptionCreatedEventData = z.infer<typeof subscriptionCreatedEventDataSchema>;
export type SubscriptionCreatedEvent = z.infer<typeof subscriptionCreatedEventSchema>;

export function subscriptionCreatedEvent<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  tier: TierId,
  result: CreditAdditionResult
): SubscriptionCreatedEvent {
  return {
    ...createEventBase('SubscriptionCreated', identity),
    data: {
      result,
      tier
    }
  };
}
