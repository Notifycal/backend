import { type UserIdentity, extractIdentity } from '@model/UserIdentity';

import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { LiveUser } from '@model/LiveUser';
import type { IdpName, UserStatus } from '@notifycal/shared/types';
import type { ReminderConfigStoreRecord } from './ReminderConfigStoreRecord';
import { extractReminderConfig } from './UserStoreRecord';

export interface LiveUserStoreRecord<TIdpName> extends UserIdentity<TIdpName> {
  Config: ReminderConfigStoreRecord;
  IdpAuthorization: AuthorizationForIdp<TIdpName>;
  UserStatus: UserStatus; // Not querying for this, but it'll be included as it's the GSI Hash key
}

export function extractLiveUser<TIdpName extends IdpName>(
  userRecord: LiveUserStoreRecord<TIdpName>
): LiveUser<TIdpName> {
  return {
    ...extractIdentity(userRecord),
    config: extractReminderConfig(userRecord.Config),
    idpAuthorization: userRecord.IdpAuthorization
  };
}
