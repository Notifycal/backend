import type { UserId, Email, IdpId } from '@own-types/model';

export type Idp = 'google';
export const idp: Record<Idp, Idp> = {
  google: 'google'
};

export interface Identity {
  userId: UserId;
  email: Email;
  idp: keyof typeof idp;
  idpId: IdpId;
}

export interface GoogleIdentity extends Identity {
  idp: typeof idp.google;
}
