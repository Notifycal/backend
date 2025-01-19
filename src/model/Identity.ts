import type { UserId, Email, IdpId } from '@own-types/model';

// When time comes, append IdpName with | 'idpName2'
export type IdpName = 'google.com';

export interface Identity {
  userId: UserId;
  email: Email;
  idp: IdpName;
  idpId: IdpId;
}

export interface GoogleIdentity extends Identity {
  idp: 'google.com';
}
