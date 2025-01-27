import type { Calendar } from '@model/Calendar';
import type { IdpConfigs } from '@model/Config';
import type { IdpName } from '@model/Identity';
import type { AuthorizationForIdp, UserGoogleAuthorization } from '@model/IdpAuthorization';
import type { CalendarId, CalendarName, UserId } from '@own-types/model';
import { v4 as uuid } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { calendarList } from './calendar';
import { GoogleCalendar } from './google/calendar';
import { UserBaseStore, type UserBaseStoreConfig } from './user-base-store';

const validUserId: UserId = uuid() as UserId;
const validIdpConfigs = {
  'google.com': {
    clientId: 'mock-client-id',
    clientSecret: 'mock-client-secret',
    redirectUri: 'mock-redirect-uri'
  }
};
const validUserBaseStoreConfig = {
  tableName: 'Users-local'
};
const validCalendarList = [
  {
    id: '346265245625' as CalendarId,
    name: 'SomeCalendarName' as CalendarName
  }
];
const validIdpName: IdpName = 'google.com';
const validAuthorizationForIdp: UserGoogleAuthorization = {
  refreshToken: 'some refresh token'
};

describe('Calendar Service', () => {
  it('should get the calendarList from idp google.com', () => {
    const googleCalendarListFn = () => Promise.resolve(validCalendarList);
    const getIdpAuthorizationFn = () => Promise.resolve(validAuthorizationForIdp);

    return testit(
      validUserId,
      validIdpName,
      validIdpConfigs,
      getIdpAuthorizationFn,
      googleCalendarListFn
    ).then((list) => {
      expect(list).toStrictEqual(validCalendarList);
    });
  });

  it('should throw an error if idp authorization was not present in persistance', () => {
    const googleCalendarListFn = () => Promise.resolve(validCalendarList);
    const getIdpAuthorizationFn = () => Promise.resolve(undefined);

    const result = testit(
      validUserId,
      validIdpName,
      validIdpConfigs,
      getIdpAuthorizationFn,
      googleCalendarListFn
    );

    return expect(result).rejects.toThrow(
      `Google Idp authorization could not be found in persistance for user id ${validUserId}`
    );
  });

  it('should throw an error if idp authorization could not be obtained', () => {
    const error = new Error('Boom!');
    const googleCalendarListFn = () => Promise.resolve(validCalendarList);
    const getIdpAuthorizationFn = () => Promise.reject(error);

    const result = testit(
      validUserId,
      validIdpName,
      validIdpConfigs,
      getIdpAuthorizationFn,
      googleCalendarListFn
    );

    return expect(result).rejects.toBe(error);
  });

  it('should throw an error if idp is google.com and GoogleCalendar service fails', () => {
    const error = new Error('Booooom!');
    const googleCalendarListFn = () => Promise.reject(error);
    const getIdpAuthorizationFn = () => Promise.resolve(validAuthorizationForIdp);

    const result = testit(
      validUserId,
      validIdpName,
      validIdpConfigs,
      getIdpAuthorizationFn,
      googleCalendarListFn
    );

    return expect(result).rejects.toBe(error);
  });

  async function testit(
    userId: UserId,
    idp: IdpName,
    idpConfigs: IdpConfigs,
    getIdpAuthorizationFn: () => Promise<AuthorizationForIdp<IdpName> | undefined>,
    googleCalendarListFn: () => Promise<Array<Calendar>>,
    userBaseStoreConfig: UserBaseStoreConfig = validUserBaseStoreConfig
  ): Promise<Array<Calendar>> {
    vi.mock('@services/user-base-store');
    const userBaseStoreMock = {
      getIdpAuthorization: vi.fn().mockImplementation(getIdpAuthorizationFn)
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(UserBaseStore.withConfig).mockReturnValue(
      userBaseStoreMock as unknown as UserBaseStore<IdpName>
    );

    vi.mock('@services/google/calendar');
    const mockInstance2 = {
      calendarList: vi.fn().mockImplementation(googleCalendarListFn)
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(GoogleCalendar.withRefreshToken).mockReturnValue(
      mockInstance2 as unknown as GoogleCalendar
    );

    return calendarList(userId, idp, idpConfigs, userBaseStoreConfig);
  }
});
