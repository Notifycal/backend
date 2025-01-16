import type { UnixTimestamp } from '@own-types/model';
import type { Identity } from './Identity';

export type UserStatus = 'banned' | 'onboarding' | 'live';

type CapitalizeKeys<T> = {
  [K in keyof T as Capitalize<K & string>]: T[K];
};

export interface User extends CapitalizeKeys<Identity> {
  LastSignInAt: UnixTimestamp;
  SignedUpAt: UnixTimestamp;
  Status: UserStatus;
}

export function extractIdentity(user: User): Identity {
  return {
    userId: user.UserId,
    email: user.Email,
    idp: user.Idp,
    idpId: user.IdpId
  };
}
