import type {
  CorrelationId,
  DateTime,
  EventId,
  Identity,
  IdpName,
  TierId
} from '@notifycal/shared/types';
import type { CreditAdditionResult } from '@services/credits-service';
import { v4 } from 'uuid';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';

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
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'SubscriptionCreated',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {
      result,
      tier
    }
  };
}
