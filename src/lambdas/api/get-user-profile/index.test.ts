import { describe, jest } from '@jest/globals';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { c, testAuthedEvent, testEvent } from '@testing/apigateway';
import { assert } from '@testing/utils/assertions';
import type { GetUserProfileConfig } from './config';
import { handler } from '.';
import {
  setEnvBaseConfig,
  setEnvDecodeAccessJwtConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { getDefaultDecodeAccessJwtConfig } from '@testing/utils/jwt';
import { UserBaseStore } from '@services/user-base-store';
import type { User } from '@model/User';
import type { OurAccessTokenClaims } from '@model/Jwt';
import { responseError, responseSuccess } from '@testing/utils/api-response-handlers';

describe('GET user profile', () => {
  it('return a user', async () => {
    const payload = {
      email: 'notifycal@gmail.com',
      role: 'user',
      permissions: {}
    } as OurAccessTokenClaims;
    const event = (await testAuthedEvent({}, {}, payload)) as unknown as APIGatewayProxyEvent;
    const getUserByEmailFn = () => Promise.resolve({ UserId: payload.email });

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(
        resp,
        responseSuccess({
          UserId: payload.email
        })
      );
    });
  });

  it('fail to return a user with 401 if no authorization present', async () => {
    const event = testEvent({}, {}) as unknown as APIGatewayProxyEvent;
    const getUserByEmailFn = () => Promise.resolve({ UserId: 'not_used' });

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(resp, responseError(401));
    });
  });

  it('fail to return a user with 404 if not present in system', async () => {
    const payload = {
      email: 'notfound@gmail.com',
      role: 'user',
      permissions: {}
    } as OurAccessTokenClaims;
    const event = (await testAuthedEvent({}, {}, payload)) as unknown as APIGatewayProxyEvent;
    const getUserByEmailFn = () => Promise.resolve(undefined);

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(resp, responseError(404));
    });
  });

  it('fail a user cannot be obtained from storage with 500', async () => {
    const payload = {
      email: 'notfound@gmail.com',
      role: 'user',
      permissions: {}
    } as OurAccessTokenClaims;
    const event = (await testAuthedEvent({}, {}, payload)) as unknown as APIGatewayProxyEvent;
    const getUserByEmailFn = () => Promise.reject(new Error('Boom!'));

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(resp, responseError(500));
    });
  });
});

function testit(
  event: APIGatewayProxyEvent,
  getUserByEmailResult: () => Promise<User | undefined>,
  env: GetUserProfileConfig = defaultEnv
): Promise<APIGatewayProxyResult> {
  setEnv(env);
  jest.spyOn(UserBaseStore.prototype, 'getUserByEmail').mockImplementation(getUserByEmailResult);
  return handler(event, c);
}

const defaultEnv = {
  decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig(),
  userBaseStore: {
    tableName: 'Users-local'
  },
  baseConfig: {
    frontendDomain: 'http://localhost:5173'
  }
};

function setEnv(config: GetUserProfileConfig) {
  setEnvDecodeAccessJwtConfig(config.decodeAccessJwtConfig);
  setEnvUserBaseStoreConfig(config.userBaseStore);
  setEnvBaseConfig(config.baseConfig);
}
