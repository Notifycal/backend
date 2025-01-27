import type { IdpName } from '@model/Identity';
import type { OurAccessTokenClaims } from '@model/Jwt';
import type { UserStoreRecord } from '@model/UserStoreRecord';
import type { Email, IdpId, UserId } from '@own-types/model';
import { UserBaseStore } from '@services/user-base-store';
import { c, testAuthedEvent, testEvent } from '@testing/apigateway';
import { responseError, responseSuccess } from '@testing/utils/api-response-handlers';
import { assert } from '@testing/utils/assertions';
import {
  setEnvBaseConfig,
  setEnvDecodeAccessJwtConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { getDefaultDecodeAccessJwtConfig } from '@testing/utils/jwt';
import { validUser } from '@testing/utils/model';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { describe, it, vi } from 'vitest';
import type { GetUserProfileConfig } from './config';
import { handler, type Event } from './index';

describe('GET User profile', () => {
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

  it('return a user', async () => {
    const event = (await testAuthedEvent(
      {},
      {},
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserByEmailFn = () => Promise.resolve(validUser(validAccessToken.userId));

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(resp, responseSuccess(validUser(validAccessToken.userId)));
    });
  });

  it('fail to return a user with 401 if no authorization present', async () => {
    const event = testEvent({}, {}) as unknown as APIGatewayProxyEvent;
    const getUserByEmailFn = () => Promise.resolve(validUser(validAccessToken.userId));

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(resp, responseError(401));
    });
  });

  it('fail to return a user with 404 if not present in system', async () => {
    const event = (await testAuthedEvent(
      {},
      {},
      { ...validAccessToken, userId: 'afaa8471-aaaa-44da-bc22-ddc4b735a847' as UserId }
    )) as unknown as APIGatewayProxyEvent;
    const getUserByEmailFn = () => Promise.resolve(undefined);

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(resp, responseError(404));
    });
  });

  it('fail a user cannot be obtained from storage with 500', async () => {
    const event = (await testAuthedEvent(
      {},
      {},
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserByEmailFn = () => Promise.reject(new Error('Boom!'));

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(resp, responseError(500));
    });
  });
});

async function testit(
  event: APIGatewayProxyEvent,
  getUserByIdFn: () => Promise<UserStoreRecord<IdpName> | undefined>,
  env: GetUserProfileConfig = defaultEnv
): Promise<APIGatewayProxyResult> {
  setEnv(env);
  vi.mock('@services/user-base-store');
  const userBaseStoreMock = {
    getUserById: vi.fn().mockImplementation(getUserByIdFn)
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

function setEnv(config: GetUserProfileConfig): void {
  setEnvDecodeAccessJwtConfig(config.decodeAccessJwtConfig);
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
  setEnvBaseConfig(config.baseConfig);
}
