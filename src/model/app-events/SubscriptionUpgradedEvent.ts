import type {
  CorrelationId,
  DateTime,
  EventId,
  Identity,
  IdpName,
  TierId,
  Percentage
} from '@notifycal/shared/types';
import type { CreditAdditionResult } from '@services/credits-service';
import { v4 } from 'uuid';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';

const subscriptionUpgradedEventDataSchema = z.object({}).passthrough();

export const subscriptionUpgradedEventSchema = eventSchemaGenerator(
  'SubscriptionUpgraded',
  subscriptionUpgradedEventDataSchema
);

export type SubscriptionUpgradedEventData = z.infer<typeof subscriptionUpgradedEventDataSchema>;
export type SubscriptionUpgradedEvent = z.infer<typeof subscriptionUpgradedEventSchema>;

export function subscriptionUpgradedEvent<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  previousTier: TierId,
  currentTier: TierId,
  remainingPercentage: Percentage,
  creditsAdded: number,
  result: CreditAdditionResult
): SubscriptionUpgradedEvent {
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'SubscriptionUpgraded',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {
      previousTier,
      currentTier,
      remainingPercentage,
      creditsAdded,
      result
    }
  };
}
