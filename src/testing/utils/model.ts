import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type {
  BusinessAddress,
  BusinessName,
  CalendarId,
  CalendarName,
  Email,
  IdpId,
  PhoneNumber,
  TemplateId,
  UnixTimestamp,
  User,
  UserId
} from '@notifycal/shared/types';

export function validUserStoreRecord(userId: UserId): UserStoreRecord<'google.com'> {
  return {
    UserId: userId,
    Email: 'test@notifycal.com' as Email,
    Idp: 'google.com',
    IdpId: 'c22ea42f-4028-468b-ac46-9d570b525081' as IdpId,
    LastSignInAt: 1736254413865 as UnixTimestamp,
    SignedUpAt: 1736254413865 as UnixTimestamp,
    UserStatus: 'live',
    Config: {
      Business: {
        Name: 'Test Business' as BusinessName,
        Address: '123 Test St, Test City, TX 12345' as BusinessAddress,
        SenderContact: {
          Type: 'phone',
          PhoneNumber: '666777888' as PhoneNumber,
          CountryCode: 'ES'
        }
      },
      Calendars: [
        {
          Id: 'test-calendar-id' as CalendarId,
          Name: 'Test Calendar' as CalendarName,
          Template: {
            Id: 'template-id' as TemplateId,
            Language: 'en'
          }
        }
      ]
    }
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
