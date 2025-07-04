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
  identity: Identity<TIdpName>,
  tier: TierId,
  result?: CreditAdditionResult,
  error?: unknown
): SubscriptionRenewalFailedEvent {
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'SubscriptionRenewalFailed',
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
