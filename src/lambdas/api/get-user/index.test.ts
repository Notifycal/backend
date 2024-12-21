import { describe, jest } from '@jest/globals';
import { type APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { c, testAuthedEvent } from '@testing/apigateway';
import { assert } from '@testing/utils/assertions';
import { GetUserConfig } from './model';
import { handler } from '.';
import { sleep } from '@testing/utils/utils';
import {
  setEnvAwsConfig,
  setEnvDecodeJwtConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { getDefaultDecodeJwtConfig } from '@testing/utils/jwt';

describe('GET user', () => {
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

    return testit(event).then((resp) => {
      assert(resp, {
        statusCode: 200,
        body: JSON.stringify({
          UserId: payload.email
        })
      });
    });
  });
});

function testit(
  event: APIGatewayProxyEventV2,
  env: GetUserConfig = defaultEnv
): Promise<APIGatewayProxyStructuredResultV2> {
  setEnv(env);
  sleep(1000);
  return handler(event, c);
}

const defaultEnv = {
  decodeJwtConfig: getDefaultDecodeJwtConfig(),
  userBaseStore: {
    tableName: 'Users-local'
  },
  awsConfig: {
    awsRegion: 'eu-west-1',
    endpoint: 'http://localhost:4566',
    credentials: {
      accessKeyId: 'foo',
      secretAccessKey: 'bar'
    }
  }
};

function setEnv(config: GetUserConfig) {
  setEnvDecodeJwtConfig(config.decodeJwtConfig);
  setEnvUserBaseStoreConfig(config.userBaseStore);
  setEnvAwsConfig(config.awsConfig);
}
