import type { Email } from '@own-types/model';

export type UserStatus = 'banned' | 'live';

export interface User {
  UserId: Email;
  LastSignInAt: number;
  SignedUpAt: number;
  Status: UserStatus;
}
