import { describe, jest } from '@jest/globals';
import { type APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { c, testAuthedEvent } from '@testing/apigateway';
import { assert } from '@testing/utils/assertions';
import { GetUserProfileConfig } from './config';
import { handler } from '.';
import {
  setEnvAwsConfig,
  setEnvDecodeAccessJwtConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { getDefaultDecodeAccessJwtConfig } from '@testing/utils/jwt';
import { UserBaseStore } from '@services/user-base-store';
import { User } from '@model/User';
import { OurAccessTokenClaims } from '@model/Jwt';
import { response200, response404, response500 } from '@services/common/api-response-handlers';

describe('GET user profile', () => {
  it('return a user', async () => {
    const payload = {
      email: 'notifycal@gmail.com',
      role: 'user',
      permissions: {}
    } as OurAccessTokenClaims;
    const event = (await testAuthedEvent({}, {}, payload)) as unknown as APIGatewayProxyEventV2;
    const getUserByEmailFn = () => Promise.resolve({ UserId: payload.email });

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(
        resp,
        response200({
          UserId: payload.email
        })
      );
    });
  });

  it('fail to return a user with 404 if not present in system', async () => {
    const payload = {
      email: 'notfound@gmail.com',
      role: 'user',
      permissions: {}
    } as OurAccessTokenClaims;
    const event = (await testAuthedEvent({}, {}, payload)) as unknown as APIGatewayProxyEventV2;
    const getUserByEmailFn = () => Promise.resolve(undefined);

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(resp, response404);
    });
  });

  it('fail a user cannot be obtained from storage with 500', async () => {
    const payload = {
      email: 'notfound@gmail.com',
      role: 'user',
      permissions: {}
    } as OurAccessTokenClaims;
    const event = (await testAuthedEvent({}, {}, payload)) as unknown as APIGatewayProxyEventV2;
    const getUserByEmailFn = () => Promise.reject('Boom!');

    return testit(event, getUserByEmailFn).then((resp) => {
      assert(resp, response500);
    });
  });
});

function testit(
  event: APIGatewayProxyEventV2,
  getUserByEmailResult: () => Promise<User | undefined>,
  env: GetUserProfileConfig = defaultEnv
): Promise<APIGatewayProxyStructuredResultV2> {
  setEnv(env);
  jest.spyOn(UserBaseStore.prototype, 'getUserByEmail').mockImplementation(getUserByEmailResult);
  return handler(event, c);
}

const defaultEnv = {
  decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig(),
  userBaseStore: {
    tableName: 'Users-local'
  },
  awsConfig: {
    awsRegion: 'eu-west-1'
  }
};

function setEnv(config: GetUserProfileConfig) {
  setEnvDecodeAccessJwtConfig(config.decodeAccessJwtConfig);
  setEnvUserBaseStoreConfig(config.userBaseStore);
  setEnvAwsConfig(config.awsConfig);
}
