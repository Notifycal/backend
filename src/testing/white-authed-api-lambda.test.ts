import { describe } from '@jest/globals';
import { type APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { c, testAuthedEvent, testEvent } from '@testing/apigateway';
import { handler, TestingWhiteApiConfig } from '@testing/white-authed-api-lambda';
import { getDefaultDecodeAccessJwtConfig, testJwt } from './utils/jwt';
import { assert } from './utils/assertions';
import { setEnvDecodeAccessJwtConfig } from './utils/config';
import { response401, response400 } from '@services/common/api-response-handlers';

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
      assert(resp, response401);
    });
  });

  it('return 400 if request payload is invalid', () => {
    const eventPromise = testAuthedEvent({
      'incorrect-field': '<SOME-FAKE-GOOGLE-CODE>'
    }) as unknown as Promise<APIGatewayProxyEventV2>;

    return eventPromise.then(testit).then((resp) => {
      assert(resp, response400);
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
  decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig(),
  config1: 'blah'
};

function setEnv(config: TestingWhiteApiConfig) {
  setEnvDecodeAccessJwtConfig(config.decodeAccessJwtConfig);
}
