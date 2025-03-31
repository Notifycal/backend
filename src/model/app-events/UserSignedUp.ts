import type { CorrelationId, DateTime, EventId, Identity, IdpName } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';

const data = z.object({});
export const userSignedUpEventSchema = eventSchemaGenerator('UserSignedUp', data);

export type UserSignedUpEvent = z.infer<typeof userSignedUpEventSchema>;

export function userSignedUp<TIdpName extends IdpName>(
  identity: Identity<TIdpName>
): UserSignedUpEvent {
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'UserSignedUp',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {}
  };
}
