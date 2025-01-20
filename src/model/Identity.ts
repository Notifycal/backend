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

export type GoogleIdentity = Identity<'google.com'>;
