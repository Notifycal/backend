import type { UserId, Email, IdpId } from '@own-types/model';

// When time comes, append IdpName with | 'idpName2'
export type IdpName = 'google.com';

export interface BaseIdentity {
  userId: UserId;
  email: Email;
}

export interface Identity<IdpName> extends BaseIdentity {
  idp: IdpName;
  idpId: IdpId;
}

export function isValidIdpName(value: string | undefined): value is IdpName {
  const validIdpNames: Array<IdpName> = ['google.com'];
  return validIdpNames.includes(value as IdpName);
}
