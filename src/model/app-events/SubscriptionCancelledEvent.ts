import type { CorrelationId, DateTime, EventId, Identity, IdpName } from '@notifycal/shared/types';
import type { CreditDeductionResult } from '@services/credits-service';
import { v4 } from 'uuid';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';

const subscriptionCancelledEventDataSchema = z.object({}).passthrough();

export const subscriptionCancelledEventSchema = eventSchemaGenerator(
  'SubscriptionCancelled',
  subscriptionCancelledEventDataSchema
);

export type SubscriptionCancelledEventData = z.infer<typeof subscriptionCancelledEventDataSchema>;
export type SubscriptionCancelledEvent = z.infer<typeof subscriptionCancelledEventSchema>;

export function subscriptionCancelledEvent<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  reason: 'unpaid' | 'cancelled',
  result: CreditDeductionResult
): SubscriptionCancelledEvent {
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'SubscriptionCancelled',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {
      reason,
      result
    }
  };
}
