import type { IdpName } from '@model/Identity';
import { type UserStoreRecord, extractIdentity } from '@model/store/UserStoreRecord';

type UncapitalizeKeys<T> = {
  [K in keyof T as Uncapitalize<K & string>]: T[K];
};

export type User<TIdpName extends IdpName> = UncapitalizeKeys<UserStoreRecord<TIdpName>>;

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
