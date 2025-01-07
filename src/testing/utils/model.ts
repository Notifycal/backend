import type { User } from '@model/User';
import type { UserId } from '@own-types/model';

export function validUser(userId: UserId): User {
  return {
    UserId: userId,
    LastSignInAt: 1736254413865,
    SignedUpAt: 1736254413865,
    Status: 'live'
  };
}
