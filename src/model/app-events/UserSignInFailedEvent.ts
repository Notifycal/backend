import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import { unixTimestampSchema } from '@notifycal/shared/schemas';
import type { Identity, IdpName } from '@notifycal/shared/types';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const data = z.object({
  lastSignInAt: unixTimestampSchema
});
export const userSignInFailedEventSchema = errorEventSchemaGenerator('UserSignInFailed', data);

export type UserSignInFailedEvent = z.infer<typeof userSignInFailedEventSchema>;

export function userSignInFailed<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  userBeforeLogin: UserStoreRecord<TIdpName>
): UserSignInFailedEvent {
  return {
    ...createEventBase('UserSignInFailed', identity),
    data: {
      lastSignInAt: userBeforeLogin.LastSignInAt
    }
  };
}
