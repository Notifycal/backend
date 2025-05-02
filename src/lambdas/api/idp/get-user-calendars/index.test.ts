import { accessTokenSchema, type OurAccessTokenClaims } from '@model/Jwt';
import type {
  Calendar,
  CalendarId,
  CalendarName,
  Email,
  IdpId,
  IdpName,
  UserId
} from '@notifycal/shared/types';
import { calendarList } from '@services/calendar';
import { c, testAuthedEvent } from '@testing/data/apigateway';
import { responseError, responseSuccess } from '@testing/utils/api-response-handlers';
import { assert } from '@testing/utils/assertions';
import {
  fakeIdpConfigs,
  setEnvBaseConfig,
  setEnvDecodeAccessJwtConfig,
  setEnvIdpConfigs,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { getDefaultDecodeAccessJwtConfig } from '@testing/utils/jwt';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { describe, it, vi } from 'vitest';
import type { GetUserCalendarsConfig } from './config';
// @ts-expect-error cjs handler export
import { handler, type Event } from './index';

describe('GET User calendars', () => {
  const validIdentity = {
    userId: 'cfaa8471-f4cc-44da-bc22-ddc4b735a847' as UserId,
    email: 'test@notifycal.com' as Email,
    idp: 'google.com' as IdpName,
    idpId: '246534735745767767' as IdpId
  };
  const validAccessToken: OurAccessTokenClaims = {
    ...validIdentity,
    role: 'user',
    permissions: {}
  };

  it('return a calendar list', async () => {
    const event = (await testAuthedEvent(
      {},
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const validCalendarList = [
      {
        id: '346265245625' as CalendarId,
        name: 'SomeCalendarName' as CalendarName
      }
    ];
    const calendarListFn = () => Promise.resolve(validCalendarList);

    return testit(event, calendarListFn).then((resp) => {
      assert(resp, responseSuccess({ result: validCalendarList }));
    });
  });

  it('return an empty calendar list', async () => {
    const event = (await testAuthedEvent(
      {},
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const validCalendarList: Array<Calendar> = [];
    const calendarListFn = () => Promise.resolve(validCalendarList);

    return testit(event, calendarListFn).then((resp) => {
      assert(resp, responseSuccess({ result: validCalendarList }));
    });
  });

  it('fail if calendar service errors with 500', async () => {
    const event = (await testAuthedEvent(
      {},
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const calendarListFn = () => Promise.reject(new Error('Booom!'));

    return testit(event, calendarListFn).then((resp) => {
      assert(resp, responseError(500));
    });
  });
});

// eslint-disable-next-line @typescript-eslint/require-await
async function testit(
  event: APIGatewayProxyEvent,
  calendarListFn: () => Promise<Array<Calendar>>,
  env: GetUserCalendarsConfig = defaultEnv
): Promise<APIGatewayProxyResult> {
  setEnv(env);
  vi.mock('@services/calendar');
  vi.mocked(calendarList).mockImplementation(calendarListFn);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return handler(event as unknown as Event, c);
}

const defaultEnv = {
  decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig(),
  userBaseStoreConfig: {
    tableName: 'Users-local'
  },
  idpConfigs: fakeIdpConfigs,
  corsConfig: {
    frontendDomain: 'http://localhost:5173'
  }
};

function setEnv(config: GetUserCalendarsConfig) {
  setEnvDecodeAccessJwtConfig(config.decodeAccessJwtConfig);
  setEnvIdpConfigs(config.idpConfigs);
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
  setEnvBaseConfig(config.corsConfig);
}
