import type { OurAccessTokenClaims } from '@model/Jwt';
import type { ReminderConfig } from '@notifycal/shared/schemas';
import { templateMap } from '@notifycal/shared/templates';
import type {
  BusinessAddress,
  BusinessName,
  CalendarId,
  CalendarName,
  Email,
  IdpId,
  IdpName,
  PhoneNumber,
  UserId
} from '@notifycal/shared/types';
import { UserBaseStore } from '@services/stores/user-base-store';
import { c, testAuthedEvent, testEvent } from '@testing/data/apigateway';
import { responseError, responseSuccess } from '@testing/utils/api-response-handlers';
import { assert } from '@testing/utils/assertions';
import {
  setEnvBaseConfig,
  setEnvDecodeAccessJwtConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { getDefaultDecodeAccessJwtConfig } from '@testing/utils/jwt';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { describe, it, vi } from 'vitest';
import type { PatchUserProfileConfig } from './config';
import { handler, type Event } from './index';

describe('PATCH User profile', () => {
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
  const validBody: ReminderConfig = {
    business: {
      name: 'someBusinessName' as BusinessName,
      address: 'someBusinessAddress' as BusinessAddress,
      contactDetails: {
        type: 'phone',
        countryCode: 'ES',
        phoneNumber: '666888999' as PhoneNumber
      }
    },
    calendars: [
      {
        id: 'aCalendarId' as CalendarId,
        name: 'aCalendarName' as CalendarName,
        templateId: templateMap['formal-en-01'].id
      }
    ]
  };

  it('patch a user', async () => {
    const event = (await testAuthedEvent(
      validBody,
      {},
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const updateUserFn = () => Promise.resolve(null);

    return testit(event, updateUserFn).then((resp) => {
      assert(resp, responseSuccess(undefined, 204));
    });
  });

  it('fail to patch a user with 400 if payload is invalid', async () => {
    const invalidBody = {
      business: {
        name: '' as BusinessName,
        address: '' as BusinessAddress,
        contactDetails: {
          type: 'something that invalidates the whole thing',
          identifier: '666777999' as PhoneNumber
        }
      },
      calendars: []
    } as unknown as ReminderConfig;
    const event = (await testAuthedEvent(
      invalidBody,
      {},
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const updateUserFn = () => Promise.resolve(null);

    return testit(event, updateUserFn).then((resp) => {
      assert(resp, responseError(400));
    });
  });

  it('fail to return a user with 401 if no authorization present', async () => {
    const event = testEvent({}, {}) as unknown as APIGatewayProxyEvent;
    const updateUserFn = () => Promise.resolve(null);

    return testit(event, updateUserFn).then((resp) => {
      assert(resp, responseError(401));
    });
  });

  it('fail if a user cannot be patched with 500', async () => {
    const event = (await testAuthedEvent(
      validBody,
      {},
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const updateUserFn = () => Promise.reject(new Error('Boom!'));

    return testit(event, updateUserFn).then((resp) => {
      assert(resp, responseError(500));
    });
  });
});

async function testit(
  event: APIGatewayProxyEvent,
  updateUserFn: () => Promise<null>,
  env: PatchUserProfileConfig = defaultEnv
): Promise<APIGatewayProxyResult> {
  setEnv(env);
  vi.mock('@services/stores/user-base-store');
  const userBaseStoreMock = {
    updateUser: vi.fn().mockImplementation(updateUserFn)
  };
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(UserBaseStore.withConfig).mockReturnValue(
    userBaseStoreMock as unknown as UserBaseStore<IdpName>
  );
  return handler(event as unknown as Event, c);
}

const defaultEnv = {
  decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig(),
  userBaseStoreConfig: {
    tableName: 'Users-local'
  },
  baseConfig: {
    frontendDomain: 'http://localhost:5173'
  }
};

function setEnv(config: PatchUserProfileConfig): void {
  setEnvDecodeAccessJwtConfig(config.decodeAccessJwtConfig);
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
  setEnvBaseConfig(config.baseConfig);
}
