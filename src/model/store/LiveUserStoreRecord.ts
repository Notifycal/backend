import { extractUserIdentity, type UserIdentityStoreRecord } from '@model/UserIdentity';

import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { LiveUser } from '@model/LiveUser';
import type { IdpName, UserStatus } from '@notifycal/shared/types';
import { fromStoreRecord, type ReminderConfigStoreRecord } from './ReminderConfigStoreRecord';

export interface LiveUserStoreRecord<TIdpName> extends UserIdentityStoreRecord<TIdpName> {
  Config: ReminderConfigStoreRecord;
  IdpAuthorization: AuthorizationForIdp<TIdpName>;
  UserStatus: UserStatus; // Not querying for this, but it'll be included as it's the GSI Hash key
}

export function extractLiveUser<TIdpName extends IdpName>(
  userRecord: LiveUserStoreRecord<TIdpName>
): LiveUser<TIdpName> {
  return {
    ...extractUserIdentity(userRecord),
    config: fromStoreRecord(userRecord.Config),
    idpAuthorization: userRecord.IdpAuthorization
  };
}
