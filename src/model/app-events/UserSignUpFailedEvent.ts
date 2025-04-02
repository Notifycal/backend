import type { CorrelationId, DateTime, EventId, Identity, IdpName } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';

const data = z.object({});
export const userSignUpFailedEventSchema = errorEventSchemaGenerator('UserSignUpFailed', data);

export type UserSignUpFailedEvent = z.infer<typeof userSignUpFailedEventSchema>;

export function userSignUpFailed<TIdpName extends IdpName>(
  identity: Identity<TIdpName>
): UserSignUpFailedEvent {
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'UserSignUpFailed',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {}
  };
}
