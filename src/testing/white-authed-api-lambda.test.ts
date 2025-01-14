import type { Event } from './white-authed-api-lambda';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { c, testAuthedEvent, testEvent } from '@testing/apigateway';
import type { TestingWhiteApiConfig } from '@testing/white-authed-api-lambda';
import { getDefaultDecodeAccessJwtConfig, testJwt } from './utils/jwt';
import { assert } from './utils/assertions';
import { setEnvBaseConfig, setEnvDecodeAccessJwtConfig } from './utils/config';
import { responseError, responseSuccess } from '@testing/utils/api-response-handlers';

describe('White authed API lambda', () => {
  it('return 200 if jwt passes verification and request payload is valid', async () => {
    const jwt = await testJwt();
    const event = testEvent(
      {
        'one-field': '<SOME-FAKE-GOOGLE-CODE>'
      },
      {
        Authorization: `Bearer ${jwt}`
      }
    ) as unknown as APIGatewayProxyEvent;

    return testit(event).then((resp) => {
      assert(resp, responseSuccess({ result: 'OK' }, 200));
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
    ) as unknown as APIGatewayProxyEvent;

    return testit(event).then((resp) => {
      assert(resp, responseError(401));
    });
  });

  it('return 400 if request payload is invalid', () => {
    const eventPromise = testAuthedEvent({
      'incorrect-field': '<SOME-FAKE-GOOGLE-CODE>'
    }) as unknown as Promise<APIGatewayProxyEvent>;

    return eventPromise.then(testit).then((resp) => {
      assert(resp, responseError(400));
    });
  });
});

const defaultEnv = {
  decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig(),
  config1: 'blah',
  baseConfig: {
    frontendDomain: 'http://localhost:5173'
  }
};

function setEnv(config: TestingWhiteApiConfig): void {
  setEnvBaseConfig(config.baseConfig);
  setEnvDecodeAccessJwtConfig(config.decodeAccessJwtConfig);
}

async function testit(
  event: APIGatewayProxyEvent,
  env: TestingWhiteApiConfig = defaultEnv
): Promise<APIGatewayProxyResult> {
  setEnv(env);
  const { handler } = await import('./white-authed-api-lambda');
  return handler(event as unknown as Event, c);
}
