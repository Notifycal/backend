import type { UserId, Email } from '@own-types/model';

export type Idp = 'google';
export const idp: Record<Idp, Idp> = {
  google: 'google'
};

export interface Identity {
  id: UserId;
  email: Email;
  idp: keyof typeof idp;
  idpId: string;
}

export interface GoogleIdentity extends Identity {
  idp: typeof idp.google;
}
