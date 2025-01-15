import type { UserId, Email } from '@own-types/model';

export const idp: Record<string, string> = {
  Google: 'Google'
};

export interface Identity {
  id: UserId;
  email: Email;
  idp: keyof typeof idp;
  idpId: string;
}

export interface GoogleIdentity extends Identity {
  idp: typeof idp.Google;
}
