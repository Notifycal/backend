import type { LiveUserStoreRecord } from '@model/store/LiveUserStoreRecord';
import type { CalendarStoreRecord } from '@model/store/ReminderConfigStoreRecord';
import type { UserIdpAuthorizationStoreRecord } from '@model/store/UserIdpAuthorizationStoreRecord';
import type {
  BusinessAddress,
  BusinessName,
  CalendarId,
  CalendarName,
  DateTime,
  Email,
  IdpId,
  IdpName,
  LanguageCode,
  PhoneNumber,
  TemplateId,
  TimeZone,
  UnixTimestamp,
  UserId,
  UserStatus
} from '@notifycal/shared/types';
import type { AwsArn } from '@own-types/model';
import * as snsService from '@services/sns';
import { UserLiveIndexStore } from '@services/stores/user-live-index-store';
import { fakeScheduledEventBridgeEvent } from '@testing/data/event-bridge-event';
import { validRawRecord as _validRawRecord } from '@testing/data/sqs-events';
import {
  setEnvCronRunConfig,
  setEnvUserCalendarFetchedTopicConfig,
  setEnvUserLiveStoreConfig
} from '@testing/utils/config';
import type { Context, SQSEvent, SQSRecord } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import type { FetchUserCalendarsConfig } from './config';
// @ts-expect-error cjs handler export
import { handler, type Event } from './index';

const validCalendar: CalendarStoreRecord = {
  Id: 'someCalendarId' as CalendarId,
  Name: 'Some Calendar Name' as CalendarName,
  Template: {
    Id: 'some-template-id' as TemplateId,
    Language: 'es' as LanguageCode
  }
};
async function* validLiveUsers(): AsyncGenerator<
  Array<LiveUserStoreRecord<'google.com'> & UserIdpAuthorizationStoreRecord<'google.com'>>,
  void,
  void
> {
  yield await Promise.resolve([
    {
      UserId: 'user123' as UserId,
      Email: 'testuser1@gmail.com' as Email,
      Idp: 'google.com',
      IdpId: 'google123' as IdpId,
      LastSignInAt: 1672531199 as UnixTimestamp,
      SignedUpAt: 1609459200 as UnixTimestamp,
      Config: {
        Calendars: [validCalendar],
        Business: {
          Name: 'businessName1' as BusinessName,
          Address: 'businessNameAddress1' as BusinessAddress,
          SenderContact: {
            Type: 'phone',
            CountryCode: 'ES',
            PhoneNumber: '666777888' as PhoneNumber
          },
          Language: 'en',
          TimeZone: 'Europe/London' as TimeZone,
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
      },
      UserStatus: 'live' as UserStatus,
      IdpAuthorization: {
        refreshToken: 'mock_refresh_token_94534'
      }
    },
    {
      UserId: 'user456' as UserId,
      Email: 'testuser2@gmail.com' as Email,
      Idp: 'google.com',
      IdpId: 'google456' as IdpId,
      LastSignInAt: 1675622399 as UnixTimestamp,
      SignedUpAt: 1612137600 as UnixTimestamp,
      Config: {
        Calendars: [validCalendar],
        Business: {
          Name: 'businessName2' as BusinessName,
          Address: 'businessNameAddress2' as BusinessAddress,
          SenderContact: {
            Type: 'phone',
            CountryCode: 'ES',
            PhoneNumber: '666777888' as PhoneNumber
          },
          Language: 'en',
          TimeZone: 'Europe/London' as TimeZone,
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
      },
      UserStatus: 'live' as UserStatus,
      IdpAuthorization: {
        refreshToken: 'mock_refresh_token_087976'
      }
    }
  ]);

  yield await Promise.resolve([
    {
      UserId: 'user789' as UserId,
      Email: 'testuser3@gmail.com' as Email,
      Idp: 'google.com',
      IdpId: 'google789' as IdpId,
      LastSignInAt: 1680460800 as UnixTimestamp,
      SignedUpAt: 1619827200 as UnixTimestamp,
      Config: {
        Calendars: [validCalendar],
        Business: {
          Name: 'businessName3' as BusinessName,
          Address: 'businessNameAddress3' as BusinessAddress,
          SenderContact: {
            Type: 'phone',
            CountryCode: 'ES',
            PhoneNumber: '666777888' as PhoneNumber
          },
          Language: 'en',
          TimeZone: 'Europe/London' as TimeZone,
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
      },
      UserStatus: 'live' as UserStatus,
      IdpAuthorization: {
        refreshToken: 'mock_refresh_token_895694'
      }
    }
  ]);
}

async function* validLiveUsersWithoutACalendar(): AsyncGenerator<
  Array<LiveUserStoreRecord<'google.com'> & UserIdpAuthorizationStoreRecord<'google.com'>>,
  void,
  void
> {
  yield await Promise.resolve([
    {
      UserId: 'user123' as UserId,
      Email: 'testuser1@gmail.com' as Email,
      Idp: 'google.com',
      IdpId: 'google123' as IdpId,
      LastSignInAt: 1672531199 as UnixTimestamp,
      SignedUpAt: 1609459200 as UnixTimestamp,
      Config: {
        Calendars: [],
        Business: {
          Name: 'businessName1' as BusinessName,
          Address: 'businessNameAddress1' as BusinessAddress,
          SenderContact: {
            Type: 'phone',
            CountryCode: 'ES',
            PhoneNumber: '666777888' as PhoneNumber
          },
          Language: 'en',
          TimeZone: 'Europe/London' as TimeZone,
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
      },
      UserStatus: 'live' as UserStatus,
      IdpAuthorization: {
        refreshToken: 'mock_refresh_token_94534'
      }
    },
    {
      UserId: 'user456' as UserId,
      Email: 'testuser2@gmail.com' as Email,
      Idp: 'google.com',
      IdpId: 'google456' as IdpId,
      LastSignInAt: 1675622399 as UnixTimestamp,
      SignedUpAt: 1612137600 as UnixTimestamp,
      Config: {
        Calendars: [validCalendar],
        Business: {
          Name: 'businessName2' as BusinessName,
          Address: 'businessNameAddress2' as BusinessAddress,
          SenderContact: {
            Type: 'phone',
            CountryCode: 'ES',
            PhoneNumber: '666777888' as PhoneNumber
          },
          Language: 'en',
          TimeZone: 'Europe/London' as TimeZone,
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
      },
      UserStatus: 'live' as UserStatus,
      IdpAuthorization: {
        refreshToken: 'mock_refresh_token_087976'
      }
    }
  ]);
}

async function* oneRejectionInBetweenLiveUsers(): AsyncGenerator<
  Array<LiveUserStoreRecord<'google.com'> & UserIdpAuthorizationStoreRecord<'google.com'>>,
  void,
  void
> {
  yield await Promise.resolve([
    {
      UserId: 'user123' as UserId,
      Email: 'testuser1@gmail.com' as Email,
      Idp: 'google.com',
      IdpId: 'google123' as IdpId,
      LastSignInAt: 1672531199 as UnixTimestamp,
      SignedUpAt: 1609459200 as UnixTimestamp,
      Config: {
        Calendars: [validCalendar],
        Business: {
          Name: 'businessName4' as BusinessName,
          Address: 'businessNameAddress4' as BusinessAddress,
          SenderContact: {
            Type: 'phone',
            CountryCode: 'ES',
            PhoneNumber: '666777888' as PhoneNumber
          },
          Language: 'en',
          TimeZone: 'Europe/London' as TimeZone,
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
      },
      UserStatus: 'live' as UserStatus,
      IdpAuthorization: {
        refreshToken: 'mock_refresh_token_12345'
      }
    }
  ]);

  yield await Promise.reject(new Error('Boom!'));

  yield await Promise.resolve([
    {
      UserId: 'user789' as UserId,
      Email: 'testuser3@gmail.com' as Email,
      Idp: 'google.com',
      IdpId: 'google789' as IdpId,
      LastSignInAt: 1680460800 as UnixTimestamp,
      SignedUpAt: 1619827200 as UnixTimestamp,
      Config: {
        Calendars: [validCalendar],
        Business: {
          Name: 'businessName5' as BusinessName,
          Address: 'businessNameAddress5' as BusinessAddress,
          SenderContact: {
            Type: 'phone',
            CountryCode: 'ES',
            PhoneNumber: '666777888' as PhoneNumber
          },
          Language: 'en',
          TimeZone: 'Europe/London' as TimeZone,
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
      },
      UserStatus: 'live' as UserStatus,
      IdpAuthorization: {
        refreshToken: 'mock_refresh_token_46744'
      }
    }
  ]);
}

async function* rejectedLiveUsers(): AsyncGenerator<
  Array<LiveUserStoreRecord<'google.com'> & UserIdpAuthorizationStoreRecord<'google.com'>>,
  void,
  void
> {
  yield await Promise.reject(new Error('Boom!'));
}
const systemEventCount = 1;

describe('Schedule fetch user calendars', () => {
  it('publish as many events as live users times calendars exist in persistance and produce a system event', async () => {
    const getLiveUsersFn = () => validLiveUsers();
    const safePublishSpy = vi
      .spyOn(snsService.SnsService.prototype, 'safePublish')
      .mockResolvedValue();
    await testit(getLiveUsersFn);

    expect(safePublishSpy).toHaveBeenCalledTimes(3 + systemEventCount);
  });

  it('cannot resume processing if persistance pagination fails', async () => {
    const getLiveUsersFn = () => oneRejectionInBetweenLiveUsers();
    const safePublishSpy = vi
      .spyOn(snsService.SnsService.prototype, 'safePublish')
      .mockResolvedValue();

    await expect(testit(getLiveUsersFn)).rejects.toThrow(
      'An error happened while processing live users'
    );
    expect(safePublishSpy).toHaveBeenCalledTimes(1 + systemEventCount);
  });

  it('should not stop processing current page or the rest of the pages even if an no user calendar event cannot be published', async () => {
    const getLiveUsersFn = () => validLiveUsersWithoutACalendar();
    const safePublishSpy = vi
      .spyOn(snsService.SnsService.prototype, 'safePublish')
      .mockResolvedValue();
    await testit(getLiveUsersFn);

    expect(safePublishSpy).toHaveBeenCalledTimes(2 + systemEventCount);
  });

  it('should not stop processing current page or the rest of the pages even if a message cannot be published', async () => {
    const getLiveUsersFn = () => validLiveUsers();
    const publishSpy = vi
      .spyOn(snsService.SnsService.prototype, 'publish')
      .mockResolvedValueOnce({
        $metadata: {}
      })
      .mockRejectedValueOnce(new Error('Boom!'))
      .mockResolvedValueOnce({
        $metadata: {}
      })
      .mockResolvedValueOnce({
        $metadata: {}
      });
    await testit(getLiveUsersFn);

    expect(publishSpy).toHaveBeenCalledTimes(3 + systemEventCount);
  });

  it('throw an error if live users cannot be fetched from persistance', () => {
    const getLiveUsersFn = () => rejectedLiveUsers();

    return expect(testit(getLiveUsersFn)).rejects.toThrow(
      'An error happened while processing live users'
    );
  });
});

function testit(
  getLiveUsersFn: () => AsyncGenerator<
    Array<LiveUserStoreRecord<'google.com'> & UserIdpAuthorizationStoreRecord<'google.com'>>,
    void,
    void
  >,
  config: FetchUserCalendarsConfig = defaultEnv
): Promise<void> {
  setEnv(config);
  vi.mock('@services/stores/user-live-index-store');
  const userBaseStoreMock = {
    getLiveUsers: vi.fn().mockImplementation(getLiveUsersFn)
  };
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(UserLiveIndexStore.withConfig).mockReturnValue(
    userBaseStoreMock as unknown as UserLiveIndexStore<IdpName>
  );
  const validRawRecord: SQSRecord = _validRawRecord(fakeScheduledEventBridgeEvent);
  const validEvent: SQSEvent = {
    Records: [validRawRecord]
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return handler(validEvent as unknown as Event, {} as Context);
}

const defaultEnv: FetchUserCalendarsConfig = {
  userLiveIndexStoreConfig: {
    tableName: 'Some-table-name',
    indexName: 'some-index-name',
    pageSize: 50
  },
  userCalendarFetchedTopicConfig: {
    topicArn: 'arn:aws:sns:eu-west-1:123000000000:mock-user-calendar-fetched-local.fifo' as AwsArn
  },
  cronRunConfig: {
    windowInMinutes: 30
  }
};

function setEnv(config: FetchUserCalendarsConfig) {
  setEnvUserLiveStoreConfig(config.userLiveIndexStoreConfig);
  setEnvUserCalendarFetchedTopicConfig(config.userCalendarFetchedTopicConfig);
  setEnvCronRunConfig(config.cronRunConfig);
}
