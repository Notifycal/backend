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
import { errorEventSchemaGenerator } from './BaseEvent';

const subscriptionUpgradeFailedEventDataSchema = z.object({}).passthrough();

export const subscriptionUpgradeFailedEventSchema = errorEventSchemaGenerator(
  'SubscriptionUpgradeFailed',
  subscriptionUpgradeFailedEventDataSchema
);

export type SubscriptionUpgradeFailedEventData = z.infer<
  typeof subscriptionUpgradeFailedEventDataSchema
>;
export type SubscriptionUpgradeFailedEvent = z.infer<typeof subscriptionUpgradeFailedEventSchema>;

export function subscriptionUpgradeFailedEvent<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  previousTier: TierId,
  currentTier: TierId,
  remainingPercentage?: Percentage,
  creditsAdded?: number,
  result?: CreditAdditionResult,
  error?: unknown
): SubscriptionUpgradeFailedEvent {
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'SubscriptionUpgradeFailed',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {
      previousTier,
      currentTier,
      remainingPercentage,
      creditsAdded,
      result,
      error
    }
  };
}
