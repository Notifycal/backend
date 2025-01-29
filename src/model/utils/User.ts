import { type UserStoreRecord, extractIdentity } from '@model/store/UserStoreRecord';
import type { IdpName, User } from '@notifycal/shared/types';

export function extractUser<TIdpName extends IdpName>(
  userRecord: UserStoreRecord<TIdpName>
): User<TIdpName> {
  return {
    ...extractIdentity(userRecord),
    lastSignInAt: userRecord.LastSignInAt,
    signedUpAt: userRecord.SignedUpAt,
    userStatus: userRecord.UserStatus
  };
}
