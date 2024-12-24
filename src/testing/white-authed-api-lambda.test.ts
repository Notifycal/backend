import { describe, jest } from '@jest/globals';
import { type APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { c, testAuthedEvent, testEvent } from '@testing/apigateway';
import { handler, TestingWhiteApiConfig } from '@testing/white-authed-api-lambda';
import { getDefaultDecodeJwtConfig, testJwt } from './utils/jwt';
import { assert } from './utils/assertions';

describe('White authed API lambda', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  it('return 200 if jwt passes verification and request payload is valid', async () => {
    const payload = {
      whatever: 'foobar'
    };
    const jwt = await testJwt(payload);
    const event = testEvent(
      {
        'one-field': '<SOME-FAKE-GOOGLE-CODE>'
      },
      {
        Authorization: `Bearer ${jwt}`
      }
    ) as unknown as APIGatewayProxyEventV2;

    return testit(event).then((resp) => {
      assert(resp, {
        statusCode: 200,
        body: 'OK'
      });
    });
  });

  it('return 401 if authorization is invalid', () => {
    const event = testEvent(
      {
        'one-field': '<SOME-FAKE-GOOGLE-CODE>'
      },
      {
        NO_AUTH: 'this is shit'
      }
    ) as unknown as APIGatewayProxyEventV2;

    return testit(event).then((resp) => {
      assert(resp, {
        statusCode: 401,
        body: 'Unauthorised',
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    });
  });

  it('return 400 if request payload is invalid', () => {
    const eventPromise = testAuthedEvent({
      'incorrect-field': '<SOME-FAKE-GOOGLE-CODE>'
    }) as unknown as Promise<APIGatewayProxyEventV2>;

    return eventPromise.then(testit).then((resp) => {
      assert(resp, {
        statusCode: 400,
        body: 'Bad Request',
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    });
  });
});

function testit(
  event: APIGatewayProxyEventV2,
  env: TestingWhiteApiConfig = defaultEnv
): Promise<APIGatewayProxyStructuredResultV2> {
  setEnv(env);
  return handler(event, c);
}

const defaultEnv = {
  decodeJwtConfig: getDefaultDecodeJwtConfig(),
  config1: 'blah'
};

function setEnv(config: TestingWhiteApiConfig) {
  process.env.JWT_PUBLIC_KEY = config.decodeJwtConfig.publicKey;
}
