import { describe, jest } from '@jest/globals';
import { type APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { c, testAuthedEvent } from '@testing/apigateway';
import { assert } from '@testing/utils/assertions';
import { GetUserProfileConfig } from './config';
import { handler } from '.';
import {
  setEnvAwsConfig,
  setEnvDecodeJwtConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { getDefaultDecodeJwtConfig } from '@testing/utils/jwt';
import { UserBaseStore } from '@services/user-base-store';
import { User } from '@model/User';

describe('GET user profile', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  it('return a user', async () => {
    const payload = {
      email: 'notifycal@gmail.com',
      role: 'user'
    };
    const event = (await testAuthedEvent({}, {}, payload)) as unknown as APIGatewayProxyEventV2;
    const getUserByEmailFn = () => Promise.resolve({ UserId: payload.email });

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(resp, {
        statusCode: 200,
        body: JSON.stringify({
          UserId: payload.email
        })
      });
    });
  });

  it('fail to return a user with 404 if not present in system', async () => {
    const payload = {
      email: 'notfound@gmail.com',
      role: 'user'
    };
    const event = (await testAuthedEvent({}, {}, payload)) as unknown as APIGatewayProxyEventV2;
    const getUserByEmailFn = () => Promise.reject('Boom!');

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(resp, {
        statusCode: 404,
        body: JSON.stringify({ message: 'Not Found' })
      });
    });
  });
});

function testit(
  event: APIGatewayProxyEventV2,
  getUserByEmailResult: () => Promise<User>,
  env: GetUserProfileConfig = defaultEnv
): Promise<APIGatewayProxyStructuredResultV2> {
  setEnv(env);
  jest.spyOn(UserBaseStore.prototype, 'getUserByEmail').mockImplementation(getUserByEmailResult);
  return handler(event, c);
}

const defaultEnv = {
  decodeJwtConfig: getDefaultDecodeJwtConfig(),
  userBaseStore: {
    tableName: 'Users-local'
  },
  awsConfig: {
    awsRegion: 'eu-west-1'
  }
};

function setEnv(config: GetUserProfileConfig) {
  setEnvDecodeJwtConfig(config.decodeJwtConfig);
  setEnvUserBaseStoreConfig(config.userBaseStore);
  setEnvAwsConfig(config.awsConfig);
}
