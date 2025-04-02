import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import { unixTimestampSchema } from '@notifycal/shared/schemas';
import type { CorrelationId, DateTime, EventId, Identity, IdpName } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';

const data = z.object({
  lastSignInAt: unixTimestampSchema
});
export const userSignInFailedEventSchema = errorEventSchemaGenerator('UserSignInFailed', data);

export type UserSignInFailedEvent = z.infer<typeof userSignInFailedEventSchema>;

export function userSignInFailed<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  userBeforeLogin: UserStoreRecord<TIdpName>
): UserSignInFailedEvent {
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'UserSignInFailed',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {
      lastSignInAt: userBeforeLogin.LastSignInAt
    }
  };
}
