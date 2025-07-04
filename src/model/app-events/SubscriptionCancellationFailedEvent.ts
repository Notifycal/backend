import type { CorrelationId, DateTime, EventId, Identity, IdpName } from '@notifycal/shared/types';
import type { CreditDeductionResult } from '@services/credits-service';
import { v4 } from 'uuid';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';

const subscriptionCancellationFailedEventDataSchema = z.object({}).passthrough();

export const subscriptionCancellationFailedEventSchema = errorEventSchemaGenerator(
  'SubscriptionCancellationFailed',
  subscriptionCancellationFailedEventDataSchema
);

export type SubscriptionCancellationFailedEventData = z.infer<
  typeof subscriptionCancellationFailedEventDataSchema
>;
export type SubscriptionCancellationFailedEvent = z.infer<
  typeof subscriptionCancellationFailedEventSchema
>;

export function subscriptionCancellationFailedEvent<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  reason: 'unpaid' | 'cancelled',
  result?: CreditDeductionResult,
  error?: unknown
): SubscriptionCancellationFailedEvent {
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'SubscriptionCancellationFailed',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {
      reason,
      result,
      error
    }
  };
}
