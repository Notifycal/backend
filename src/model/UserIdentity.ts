import type { CapitalizeKeys, Identity, IdpName } from '@notifycal/shared/types';

export type UserIdentity<TIdpName> = CapitalizeKeys<Identity<TIdpName>>;

export function extractIdentity<TIdpName extends IdpName>(
  user: UserIdentity<TIdpName>
): Identity<TIdpName> {
  return {
    userId: user.UserId,
    email: user.Email,
    idp: user.Idp,
    idpId: user.IdpId
  };
}
