import type { UserGoogleAuthorization } from '@model/IdpAuthorization';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type {
  Email,
  IdpId,
  IdpName,
  UnixTimestamp,
  UserId,
  UserStatus
} from '@notifycal/shared/types';
import type { AwsArn } from '@own-types/model';
import { UserLiveIndexStore } from '@services/stores/user-live-index-store';
import { fakeScheduledEventBridgeEvent } from '@testing/event-bridge-event';
import { setEnvUserCalendarFetchedConfig, setEnvUserLiveStoreConfig } from '@testing/utils/config';
import type { Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import type { FetchUserCalendarsConfig } from './config';
import { handler } from './index';
import * as snsService from './send-message';

async function* validLiveUsers(): AsyncGenerator<
  Array<UserStoreRecord<'google.com'> & UserGoogleAuthorization>,
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
      UserStatus: 'active' as UserStatus,
      refreshToken: 'mock_refresh_token_12345'
    },
    {
      UserId: 'user456' as UserId,
      Email: 'testuser2@gmail.com' as Email,
      Idp: 'google.com',
      IdpId: 'google456' as IdpId,
      LastSignInAt: 1675622399 as UnixTimestamp,
      SignedUpAt: 1612137600 as UnixTimestamp,
      UserStatus: 'inactive' as UserStatus,
      refreshToken: 'mock_refresh_token_67890'
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
      UserStatus: 'pending' as UserStatus,
      refreshToken: 'mock_refresh_token_98765'
    }
  ]);
}

async function* oneRejectionInBetweenLiveUsers(): AsyncGenerator<
  Array<UserStoreRecord<'google.com'> & UserGoogleAuthorization>,
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
      UserStatus: 'active' as UserStatus,
      refreshToken: 'mock_refresh_token_12345'
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
      UserStatus: 'pending' as UserStatus,
      refreshToken: 'mock_refresh_token_98765'
    }
  ]);
}

async function* rejectedLiveUsers(): AsyncGenerator<
  Array<UserStoreRecord<'google.com'> & UserGoogleAuthorization>,
  void,
  void
> {
  yield await Promise.reject(new Error('Boom!'));
}

describe('Schedule fetch user calendars', () => {
  it('publish as many events as live users exist in persistance', async () => {
    const getLiveUsersFn = () => validLiveUsers();
    const publishToSNSCalendarMessageSpy = vi
      .spyOn(snsService, 'publishToSNSCalendarMessage')
      .mockResolvedValue({
        $metadata: {}
      });
    await testit(getLiveUsersFn);

    expect(publishToSNSCalendarMessageSpy).toHaveBeenCalledTimes(3);
  });

  it('should not stop even if persistance pagination fails', async () => {
    const getLiveUsersFn = () => oneRejectionInBetweenLiveUsers();
    const publishToSNSCalendarMessageSpy = vi
      .spyOn(snsService, 'publishToSNSCalendarMessage')
      .mockResolvedValue({
        $metadata: {}
      });

    await expect(testit(getLiveUsersFn)).rejects.toThrow(
      'An error happened while processing live users. Error: Boom!'
    );
    expect(publishToSNSCalendarMessageSpy).toHaveBeenCalledTimes(1);
  });

  it('should not stop processing current page or the rest of the pages even if a message cannot be published', async () => {
    const getLiveUsersFn = () => validLiveUsers();
    const publishToSNSCalendarMessageSpy = vi
      .spyOn(snsService, 'publishToSNSCalendarMessage')
      .mockRejectedValueOnce(new Error('Boom!'))
      .mockResolvedValueOnce({
        $metadata: {}
      })
      .mockResolvedValueOnce({
        $metadata: {}
      });
    await testit(getLiveUsersFn);

    expect(publishToSNSCalendarMessageSpy).toHaveBeenCalledTimes(3);
  });

  it('throw an error if live users cannot be fetched from persistance', () => {
    const getLiveUsersFn = () => rejectedLiveUsers();

    return expect(testit(getLiveUsersFn)).rejects.toThrow(
      'An error happened while processing live users. Error: Boom!'
    );
  });
});

function testit(
  getLiveUsersFn: () => AsyncGenerator<
    Array<UserStoreRecord<'google.com'> & UserGoogleAuthorization>,
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
  return handler(fakeScheduledEventBridgeEvent as never, {} as Context);
}

const defaultEnv: FetchUserCalendarsConfig = {
  userLiveIndexStoreConfig: {
    tableName: 'Some-table-name',
    indexName: 'some-index-name',
    pageSize: 50
  },
  userCalendarFetchedTopicConfig: {
    topicArn: 'arn:aws:sns:eu-west-1:123000000789:mock-user-calendar-fetched-local.fifo' as AwsArn
  }
};

function setEnv(config: FetchUserCalendarsConfig) {
  setEnvUserLiveStoreConfig(config.userLiveIndexStoreConfig);
  setEnvUserCalendarFetchedConfig(config.userCalendarFetchedTopicConfig);
}
