import { describe, expect, jest } from '@jest/globals';
import { type APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { c, testEvent } from '@testing/apigateway';
import type { ParsedResult } from '@aws-lambda-powertools/parser/types';
import { handler, TestingPayload, TestingWhiteApiConfig } from '@testing/white-authed-api-lambda';
import { testJwt } from './jwt';

describe('White authed API lambda', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  it('be ok', async () => {
    const payload = {
      whatever: 'foobar'
    };
    const jwt = await testJwt(payload);
    const event = testEvent(
      {
        'one-field': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
      },
      {
        Authorization: `Bearer ${jwt}`
      }
    ) as unknown as ParsedResult<APIGatewayProxyEventV2, TestingPayload>;

    return testit(event).then((resp) => {
      assert(resp, {
        statusCode: 200,
        body: 'OK'
      });
    });
  });

  it('be not ok', () => {
    const event = testEvent(
      {
        'one-field': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
      },
      {
        NO_AUTH: 'this is shit'
      }
    ) as unknown as ParsedResult<APIGatewayProxyEventV2, TestingPayload>;

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
});

function testit(
  event: ParsedResult<APIGatewayProxyEventV2, TestingPayload>,
  env: TestingWhiteApiConfig = defaultEnv
): Promise<APIGatewayProxyStructuredResultV2> {
  setEnv(env);
  return handler(event, c);
}

/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["assert"] }] */
function assert(
  result: APIGatewayProxyStructuredResultV2,
  expectation: APIGatewayProxyStructuredResultV2
): void {
  expect(result).toEqual(expectation);
}

const defaultEnv = {
  publicKey: `some_fake_public_key`
};

function setEnv(config: TestingWhiteApiConfig) {
  process.env.JWT_PUBLIC_KEY = config.publicKey;
}
