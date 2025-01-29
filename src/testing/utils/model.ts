import type { User } from '@model/api/User';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type { Email, IdpId, UnixTimestamp, UserId } from '@own-types/model';

export function validUserStoreRecord(userId: UserId): UserStoreRecord<'google.com'> {
  return {
    UserId: userId,
    Email: 'test@notifycal.com' as Email,
    Idp: 'google.com',
    IdpId: 'c22ea42f-4028-468b-ac46-9d570b525081' as IdpId,
    LastSignInAt: 1736254413865 as UnixTimestamp,
    SignedUpAt: 1736254413865 as UnixTimestamp,
    UserStatus: 'live'
  };
}

export function validUser(userId: UserId): User<'google.com'> {
  return {
    userId: userId,
    email: 'test@notifycal.com' as Email,
    idp: 'google.com',
    idpId: 'c22ea42f-4028-468b-ac46-9d570b525081' as IdpId,
    lastSignInAt: 1736254413865 as UnixTimestamp,
    signedUpAt: 1736254413865 as UnixTimestamp,
    userStatus: 'live'
  };
}
