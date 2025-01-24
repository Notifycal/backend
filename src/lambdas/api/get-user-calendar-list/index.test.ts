import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { c, testAuthedEvent } from '@testing/apigateway';
import { assert } from '@testing/utils/assertions';
import type { GetUserCalendarListConfig } from './config';
import {
  fakeIdpConfigs,
  setEnvBaseConfig,
  setEnvDecodeAccessJwtConfig,
  setEnvIdpConfigs
} from '@testing/utils/config';
import { getDefaultDecodeAccessJwtConfig } from '@testing/utils/jwt';
import type { OurAccessTokenClaims } from '@model/Jwt';
import { responseSuccess, responseError } from '@testing/utils/api-response-handlers';
import { handler, type Event } from './index';
import { describe, it, vi } from 'vitest';
import type { CalendarId, CalendarName, Email, IdpId, UserId } from '@own-types/model';
import type { IdpName } from '@model/Identity';
import { calendarList } from '@services/calendar';
import type { Calendar } from '@model/Calendar';

describe('GET Calendar list', () => {
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
      assert(resp, responseSuccess(validCalendarList));
    });
  });

  it('return an empty calendar list', async () => {
    const event = (await testAuthedEvent(
      {},
      {},
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const validCalendarList: Array<Calendar> = [];
    const calendarListFn = () => Promise.resolve(validCalendarList);

    return testit(event, calendarListFn).then((resp) => {
      assert(resp, responseSuccess(validCalendarList));
    });
  });

  it('fail if calendar service errors with 500', async () => {
    const event = (await testAuthedEvent(
      {},
      {},
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const calendarListFn = () => Promise.reject(new Error('Booom!'));

    return testit(event, calendarListFn).then((resp) => {
      assert(resp, responseError(500));
    });
  });
});

async function testit(
  event: APIGatewayProxyEvent,
  calendarListFn: () => Promise<Array<Calendar>>,
  env: GetUserCalendarListConfig = defaultEnv
): Promise<APIGatewayProxyResult> {
  setEnv(env);
  vi.mock('@services/calendar', () => ({
    calendarList: vi.fn()
  }));
  vi.mocked(calendarList).mockImplementation(calendarListFn);
  return handler(event as unknown as Event, c);
}

const defaultEnv = {
  decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig(),
  userBaseStoreConfig: {
    tableName: 'Users-local'
  },
  idpConfigs: fakeIdpConfigs,
  baseConfig: {
    frontendDomain: 'http://localhost:5173'
  }
};

function setEnv(config: GetUserCalendarListConfig) {
  setEnvDecodeAccessJwtConfig(config.decodeAccessJwtConfig);
  setEnvIdpConfigs(config.idpConfigs);
  setEnvBaseConfig(config.baseConfig);
}
