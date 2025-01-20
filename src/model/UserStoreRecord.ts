import type { UnixTimestamp } from '@own-types/model';
import type { Identity, IdpName } from './Identity';
import type { UserIdpAuthorization } from './IdpAuthorization';

export type UserStatus = 'banned' | 'onboarding' | 'live';

type CapitalizeKeys<T> = {
  [K in keyof T as Capitalize<K & string>]: T[K];
};

type UserIdentity<TIdpName> = CapitalizeKeys<Identity<TIdpName>>;
interface UserStuff<TIdpName> extends UserIdentity<TIdpName> {
  LastSignInAt: UnixTimestamp;
  SignedUpAt: UnixTimestamp;
  Status: UserStatus;
}
export type UserStoreRecord<TIdpName> = UserStuff<TIdpName> &
  CapitalizeKeys<UserIdpAuthorization<TIdpName>>;

export function extractIdentity<TIdpName extends IdpName>(
  user: UserStoreRecord<TIdpName>
): Identity<TIdpName> {
  return {
    userId: user.UserId,
    email: user.Email,
    idp: user.Idp,
    idpId: user.IdpId
  };
}
