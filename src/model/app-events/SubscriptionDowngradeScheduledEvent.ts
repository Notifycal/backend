import { z } from 'zod';
import type { CorrelationId, DateTime, EventId, Identity, IdpName } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { eventSchemaGenerator } from './BaseEvent';

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
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'SubscriptionDowngradeScheduled',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {}
  };
}
