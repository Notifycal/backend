import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import type { LiveUserStoreRecord } from '@model/store/LiveUserStoreRecord';
import type { UserIdpAuthorizationStoreRecord } from '@model/store/UserIdpAuthorizationStoreRecord';
import type {
  BusinessAddress,
  BusinessName,
  Calendar,
  CalendarId,
  CalendarName,
  Email,
  IdpId,
  IdpName,
  LanguageCode,
  PhoneNumber,
  TemplateId,
  UnixTimestamp,
  UserId,
  UserStatus
} from '@notifycal/shared/types';
import type { AwsArn, Url } from '@own-types/model';
import { AuditTrailService } from '@services/audit-trail';
import * as snsService from '@services/sns';
import { UserLiveIndexStore } from '@services/stores/user-live-index-store';
import { fakeScheduledEventBridgeEvent } from '@testing/data/event-bridge-event';
import {
  setEnvAuditTrailQueueConfig,
  setEnvCronRunConfig,
  setEnvUserCalendarFetchedTopicConfig,
  setEnvUserLiveStoreConfig
} from '@testing/utils/config';
import type { Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import type { FetchUserCalendarsConfig } from './config';
import { handler, type Event } from './index';

const validCalendar: Calendar & { template: { id: TemplateId; language: LanguageCode } } = {
  id: 'someCalendarId' as CalendarId,
  name: 'Some Calendar Name' as CalendarName,
  template: {
    id: 'some-template-id' as TemplateId,
    language: 'es' as LanguageCode
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
        calendars: [validCalendar],
        business: {
          name: 'businessName1' as BusinessName,
          address: 'businessNameAddress1' as BusinessAddress,
          senderContact: {
            type: 'phone',
            countryCode: 'ES',
            phoneNumber: '666777888' as PhoneNumber
          }
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
        calendars: [validCalendar],
        business: {
          name: 'businessName2' as BusinessName,
          address: 'businessNameAddress2' as BusinessAddress,
          senderContact: {
            type: 'phone',
            countryCode: 'ES',
            phoneNumber: '666777888' as PhoneNumber
          }
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
        calendars: [validCalendar],
        business: {
          name: 'businessName3' as BusinessName,
          address: 'businessNameAddress3' as BusinessAddress,
          senderContact: {
            type: 'phone',
            countryCode: 'ES',
            phoneNumber: '666777888' as PhoneNumber
          }
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
        calendars: [],
        business: {
          name: 'businessName1' as BusinessName,
          address: 'businessNameAddress1' as BusinessAddress,
          senderContact: {
            type: 'phone',
            countryCode: 'ES',
            phoneNumber: '666777888' as PhoneNumber
          }
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
        calendars: [validCalendar],
        business: {
          name: 'businessName2' as BusinessName,
          address: 'businessNameAddress2' as BusinessAddress,
          senderContact: {
            type: 'phone',
            countryCode: 'ES',
            phoneNumber: '666777888' as PhoneNumber
          }
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
        calendars: [validCalendar],
        business: {
          name: 'businessName4' as BusinessName,
          address: 'businessNameAddress4' as BusinessAddress,
          senderContact: {
            type: 'phone',
            countryCode: 'ES',
            phoneNumber: '666777888' as PhoneNumber
          }
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
        calendars: [validCalendar],
        business: {
          name: 'businessName5' as BusinessName,
          address: 'businessNameAddress5' as BusinessAddress,
          senderContact: {
            type: 'phone',
            countryCode: 'ES',
            phoneNumber: '666777888' as PhoneNumber
          }
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

describe('Schedule fetch user calendars', () => {
  it('publish as many events as live users times calendars exist in persistance', async () => {
    const getLiveUsersFn = () => validLiveUsers();
    const publishSpy = vi.spyOn(snsService.SnsService.prototype, 'publish').mockResolvedValue({
      $metadata: {}
    });
    const auditTrailSpy = vi
      .spyOn(AuditTrailService.prototype, 'send')
      .mockResolvedValue({} as SendMessageCommandOutput);
    await testit(getLiveUsersFn);

    expect(publishSpy).toHaveBeenCalledTimes(3);
    expect(auditTrailSpy).toHaveBeenCalledTimes(0);
  });

  it('cannot resume processing if persistance pagination fails', async () => {
    const getLiveUsersFn = () => oneRejectionInBetweenLiveUsers();
    const publishSpy = vi.spyOn(snsService.SnsService.prototype, 'publish').mockResolvedValue({
      $metadata: {}
    });

    await expect(testit(getLiveUsersFn)).rejects.toThrow(
      'An error happened while processing live users'
    );
    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should not stop processing current page or the rest of the pages even if an no user calendar event cannot be sent to audit trail service', async () => {
    const getLiveUsersFn = () => validLiveUsersWithoutACalendar();
    const publishSpy = vi.spyOn(snsService.SnsService.prototype, 'publish').mockResolvedValue({
      $metadata: {}
    });
    const auditTrailSpy = vi
      .spyOn(AuditTrailService.prototype, 'send')
      .mockResolvedValue({} as SendMessageCommandOutput);
    await testit(getLiveUsersFn);

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(auditTrailSpy).toHaveBeenCalledTimes(1);
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

    expect(publishSpy).toHaveBeenCalledTimes(3);
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
  return handler(fakeScheduledEventBridgeEvent as unknown as Event, {} as Context);
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
  },
  auditTrailQueueConfig: {
    queueUrl: 'https://fake-queue-url' as Url
  }
};

function setEnv(config: FetchUserCalendarsConfig) {
  setEnvUserLiveStoreConfig(config.userLiveIndexStoreConfig);
  setEnvUserCalendarFetchedTopicConfig(config.userCalendarFetchedTopicConfig);
  setEnvAuditTrailQueueConfig(config.auditTrailQueueConfig);
  setEnvCronRunConfig(config.cronRunConfig);
}
