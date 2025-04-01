import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import { unixTimestampSchema } from '@notifycal/shared/schemas';
import type { CorrelationId, DateTime, EventId, Identity, IdpName } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';

const data = z.object({
  lastSignInAt: unixTimestampSchema
});
export const userSignedInEventSchema = eventSchemaGenerator('UserSignedIn', data);

export type UserSignedInEvent = z.infer<typeof userSignedInEventSchema>;

export function userSignedIn<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  userBeforeLogin: UserStoreRecord<TIdpName>
): UserSignedInEvent {
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'UserSignedIn',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {
      lastSignInAt: userBeforeLogin.LastSignInAt
    }
  };
}
