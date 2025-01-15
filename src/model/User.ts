import type { Email, UnixTimestamp, UserId } from '@own-types/model';
import type { idp } from './Identity';

export type UserStatus = 'banned' | 'onboarding' | 'live';

export interface User {
  UserId: UserId;
  Email: Email;
  Idp: keyof typeof idp;
  IdpId: string;
  LastSignInAt: UnixTimestamp;
  SignedUpAt: UnixTimestamp;
  Status: UserStatus;
}
