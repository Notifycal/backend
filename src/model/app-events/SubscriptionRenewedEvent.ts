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

const subscriptionRenewedEventDataSchema = z.object({}).passthrough();

export const subscriptionRenewedEventSchema = eventSchemaGenerator(
  'SubscriptionRenewed',
  subscriptionRenewedEventDataSchema
);

export type SubscriptionRenewedEventData = z.infer<typeof subscriptionRenewedEventDataSchema>;
export type SubscriptionRenewedEvent = z.infer<typeof subscriptionRenewedEventSchema>;

export function subscriptionRenewedEvent<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  tier: TierId,
  result: CreditAdditionResult
): SubscriptionRenewedEvent {
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'SubscriptionRenewed',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {
      tier,
      result
    }
  };
}
