import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { c, testAuthedEvent, testEvent } from '@testing/apigateway';
import { assert } from '@testing/utils/assertions';
import type { GetUserProfileConfig } from './config';
import {
  setEnvBaseConfig,
  setEnvDecodeAccessJwtConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { getDefaultDecodeAccessJwtConfig } from '@testing/utils/jwt';
import type { User } from '@model/User';
import type { OurAccessTokenClaims } from '@model/Jwt';
import { responseError, responseSuccess } from '@testing/utils/api-response-handlers';
import { validUser } from '@testing/utils/model';
import { handler, type Event } from './index';
import { UserBaseStore } from '@services/user-base-store';
import { describe, it, vi } from 'vitest';

describe('GET User profile', () => {
  it('return a user', async () => {
    const payload = {
      email: 'notifycal@gmail.com',
      role: 'user',
      permissions: {}
    } as OurAccessTokenClaims;
    const event = (await testAuthedEvent({}, {}, payload)) as unknown as APIGatewayProxyEvent;
    const getUserByEmailFn = () => Promise.resolve(validUser(payload.email));

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(resp, responseSuccess(validUser(payload.email)));
    });
  });

  it('fail to return a user with 401 if no authorization present', async () => {
    const event = testEvent({}, {}) as unknown as APIGatewayProxyEvent;
    const getUserByEmailFn = () => Promise.resolve(validUser('not_used'));

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

async function testit(
  event: APIGatewayProxyEvent,
  getUserByEmailFn: () => Promise<User | undefined>,
  env: GetUserProfileConfig = defaultEnv
): Promise<APIGatewayProxyResult> {
  setEnv(env);
  vi.mock('@services/user-base-store', () => {
    const UserBaseStore = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    UserBaseStore.prototype.getUserByEmail = vi.fn();
    return {
      UserBaseStore
    };
  });
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(UserBaseStore.prototype.getUserByEmail).mockImplementation(getUserByEmailFn);
  return handler(event as unknown as Event, c);
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
