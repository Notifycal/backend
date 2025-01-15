import { idp } from '@model/Identity';
import type { User } from '@model/User';
import type { Email, UnixTimestamp, UserId } from '@own-types/model';

export function validUser(userId: UserId): User {
  return {
    UserId: userId,
    Email: 'test@notifycal.com' as Email,
    Idp: idp.Google,
    IdpId: 'c22ea42f-4028-468b-ac46-9d570b525081',
    LastSignInAt: 1736254413865 as UnixTimestamp,
    SignedUpAt: 1736254413865 as UnixTimestamp,
    Status: 'live'
  };
}
