import type { CapitalizeKeys, IdpName, UserIdentity } from '@notifycal/shared/types';

export type UserIdentityStoreRecord<TIdpName> = CapitalizeKeys<UserIdentity<TIdpName>>;

export function extractUserIdentity<TIdpName extends IdpName>(
  user: UserIdentityStoreRecord<TIdpName>
): UserIdentity<TIdpName> {
  return {
    userId: user.UserId,
    email: user.Email,
    idp: user.Idp,
    idpId: user.IdpId
  };
}
