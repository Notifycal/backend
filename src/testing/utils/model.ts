import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type {
  BusinessAddress,
  BusinessName,
  CalendarId,
  CalendarName,
  DateTime,
  Email,
  IdpId,
  SMSSenderId,
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
      Calendars: [
        {
          Id: 'test-calendar-id' as CalendarId,
          Name: 'Test Calendar' as CalendarName,
          Template: {
            Id: 'template-id' as TemplateId,
            Language: 'en'
          }
        }
      ],
      Business: {
        Name: 'Test Business' as BusinessName,
        Address: '123 Test St, Test City, TX 12345' as BusinessAddress,
        SenderContact: {
          Type: 'sms',
          Identifier: 'NotifyCal' as SMSSenderId
        },
        Language: 'en',
        CompanyIndustry: {
          Category: 'category',
          Subcategory: 'subcategory',
          CustomIndustry: 'custom'
        },
        CompanySize: 'freelancer'
      },
      Confirmation: {
        TermsAccepted: '2023-01-01T00:00:00Z' as DateTime,
        PrivacyAccepted: '2023-01-01T00:00:00Z' as DateTime,
        MarketingOptInAccepted: '2023-01-01T00:00:00Z' as DateTime
      }
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
    userStatus: 'live',
    config: {
      calendars: [
        {
          id: 'test-calendar-id' as CalendarId,
          name: 'Test Calendar' as CalendarName,
          template: {
            id: 'template-id' as TemplateId,
            language: 'en'
          }
        }
      ],
      business: {
        name: 'Test Business' as BusinessName,
        address: '123 Test St, Test City, TX 12345' as BusinessAddress,
        senderContact: {
          type: 'sms',
          identifier: 'NotifyCal' as SMSSenderId
        },
        language: 'en',
        companyIndustry: {
          category: 'category',
          subcategory: 'subcategory',
          customIndustry: 'custom'
        },
        companySize: 'freelancer'
      },
      confirmation: {
        termsAccepted: '2023-01-01T00:00:00Z' as DateTime,
        privacyAccepted: '2023-01-01T00:00:00Z' as DateTime,
        marketingOptInAccepted: '2023-01-01T00:00:00Z' as DateTime
      }
    }
  };
}
