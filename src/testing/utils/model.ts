import type { UserStoreRecord } from '@model/UserStoreRecord';
import type { Email, IdpId, UnixTimestamp, UserId } from '@own-types/model';

export function validUser(userId: UserId): UserStoreRecord<'google.com'> {
  return {
    UserId: userId,
    Email: 'test@notifycal.com' as Email,
    Idp: 'google.com',
    IdpId: 'c22ea42f-4028-468b-ac46-9d570b525081' as IdpId,
    LastSignInAt: 1736254413865 as UnixTimestamp,
    SignedUpAt: 1736254413865 as UnixTimestamp,
    Status: 'live',
    Auth: {
      refreshToken: 'some_google_refresh_token'
    }
  };
}
