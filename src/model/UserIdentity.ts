import type { Identity, IdpName } from '@notifycal/shared/types';

export type CapitalizeKeys<T> = {
  [K in keyof T as Capitalize<K & string>]: T[K];
};

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
