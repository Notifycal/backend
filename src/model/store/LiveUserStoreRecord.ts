import { type UserIdentity, extractIdentity } from '@model/UserIdentity';

import type { LiveUser } from '@model/LiveUser';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { IdpName, ReminderConfig, UserStatus } from '@notifycal/shared/types';

export interface LiveUserStoreRecord<TIdpName> extends UserIdentity<TIdpName> {
  Config: ReminderConfig;
  IdpAuthorization: AuthorizationForIdp<TIdpName>;
  UserStatus: UserStatus; // Not querying for this, but it'll be included as it's the GSI Hash key
}

export function extractLiveUser<TIdpName extends IdpName>(
  userRecord: LiveUserStoreRecord<TIdpName>
): LiveUser<TIdpName> {
  return {
    ...extractIdentity(userRecord),
    config: userRecord.Config,
    idpAuthorization: userRecord.IdpAuthorization
  };
}
