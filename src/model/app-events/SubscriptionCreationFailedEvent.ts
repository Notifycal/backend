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
import { errorEventSchemaGenerator } from './BaseEvent';

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
  identity: Identity<TIdpName>,
  tier: TierId,
  result?: CreditAdditionResult,
  error?: unknown
): SubscriptionCreationFailedEvent {
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'SubscriptionCreationFailed',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {
      tier,
      result,
      error
    }
  };
}
