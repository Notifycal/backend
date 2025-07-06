import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import { unixTimestampSchema } from '@notifycal/shared/schemas';
import type { Identity, IdpName } from '@notifycal/shared/types';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase, toEventSourceIdentity } from './common';

const data = z.object({
  lastSignInAt: unixTimestampSchema
});
export const userSignedInEventSchema = eventSchemaGenerator('UserSignInSucceeded', data);

export type UserSignedInEvent = z.infer<typeof userSignedInEventSchema>;

export function userSignedIn<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  userBeforeLogin: UserStoreRecord<TIdpName>
): UserSignedInEvent {
  return {
    ...createEventBase('UserSignInSucceeded', toEventSourceIdentity(identity)),
    data: {
      lastSignInAt: userBeforeLogin.LastSignInAt
    }
  };
}
