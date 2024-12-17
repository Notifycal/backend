import { describe, expect, jest } from '@jest/globals';
import { LoginConfig } from './config';
import { handler, type Payload } from './index';
import * as loginService from 'services/login';
import * as googleOAuth from 'services/google-oauth';
import * as jwt from 'services/jwt';
import { Email, Jwt } from 'types/model';
import { type APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { c, testEvent, unsafeTestEvent } from 'testing/apigateway';
import type { ParsedResult } from '@aws-lambda-powertools/parser/types';
import { User } from 'model/User';

describe('Login', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  it('should sign up a user', () => {
    const event = testEvent({
      'google-id-token': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as ParsedResult<APIGatewayProxyEventV2, Payload>;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const validJwt = 'some_valid_jwt';
    const jwtBuildFn = () => Promise.resolve(validJwt);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn).then((resp) => {
      assert(resp, {
        statusCode: 200,
        body: 'OK',
        headers: {
          'Set-Authorization': validJwt,
          'Set-Refresh-Token': 'WIP'
        }
      });
    });
  });

  it('should sign in a user', () => {
    const event = testEvent({
      'google-id-token': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as ParsedResult<APIGatewayProxyEventV2, Payload>;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const validJwt1 = 'some_valid_jwt_1';
    const jwtBuildFn1 = () => Promise.resolve(validJwt1);
    const validJwt2 = 'some_valid_jwt_2';
    const jwtBuildFn2 = () => Promise.resolve(validJwt2);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });

    return testit(event, idTokenVerificationFn, jwtBuildFn1, signInOrUpUserFn).then(() =>
      testit(event, idTokenVerificationFn, jwtBuildFn2, signInOrUpUserFn).then((resp) =>
        assert(resp, {
          statusCode: 200,
          body: 'OK',
          headers: {
            'Set-Authorization': validJwt2,
            'Set-Refresh-Token': 'WIP'
          }
        })
      )
    );
  });

  it('should fail id token verification with 401', () => {
    const event = testEvent({
      'google-id-token': '<SOME-INCORRECT-GOOGLE-ID-TOKEN>'
    }) as unknown as ParsedResult<APIGatewayProxyEventV2, Payload>;
    const userEmail = 'failure@notifycal.com';
    const idTokenVerificationFn = () => Promise.reject(userEmail);
    const validJwt = 'some_valid_jwt';
    const jwtBuildFn = () => Promise.resolve(validJwt);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn).then((resp) =>
      assert(resp, {
        statusCode: 401,
        body: 'Unauthorised'
      })
    );
  });

  it('should fail input validation with 401', () => {
    const event = unsafeTestEvent({
      'incorrect-field': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as ParsedResult<APIGatewayProxyEventV2, Payload>;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const validJwt = 'some_valid_jwt';
    const jwtBuildFn = () => Promise.resolve(validJwt);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn).then((resp) =>
      assert(resp, {
        statusCode: 401,
        body: 'Unauthorised'
      })
    );
  });

  it('should fail to generate JWT with 500', () => {
    const event = testEvent({
      'google-id-token': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as ParsedResult<APIGatewayProxyEventV2, Payload>;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const jwtBuildFn = () => Promise.reject('Boooom!');
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn).then((resp) =>
      assert(resp, {
        statusCode: 500,
        body: 'KO'
      })
    );
  });

  it('should fail if environment is not set correctly with 500', () => {
    const event = testEvent({
      'google-id-token': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as ParsedResult<APIGatewayProxyEventV2, Payload>;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const jwtBuildFn = () => Promise.resolve('JWT build error');
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });
    const env = {
      ...defaultEnv,
      googleClientId: null as unknown as string
    };

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn, env).then((resp) =>
      assert(resp, {
        statusCode: 500,
        body: 'KO'
      })
    );
  });

  it('should fail if user cannot sign in or up with 500', () => {
    const event = testEvent({
      'google-id-token': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as ParsedResult<APIGatewayProxyEventV2, Payload>;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const validJwt = 'some_valid_jwt';
    const jwtBuildFn = () => Promise.resolve(validJwt);
    const signInOrUpUserFn = () => Promise.reject('Error to sign in or up a user');

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn).then((resp) => {
      assert(resp, {
        statusCode: 500,
        body: 'KO'
      });
    });
  });
});

function testit(
  event: ParsedResult<APIGatewayProxyEventV2, Payload>,
  idTokenVerificationResult: () => Promise<Email>,
  jwtBuildResult: () => Promise<Jwt>,
  signInOrUpUserResult: () => Promise<User>,
  env: LoginConfig = defaultEnv
): Promise<APIGatewayProxyStructuredResultV2> {
  setEnv(env);
  jest.spyOn(googleOAuth, 'verifyGoogleToken').mockImplementation(idTokenVerificationResult);
  jest.spyOn(jwt, 'buildJwt').mockImplementation(jwtBuildResult);
  jest.spyOn(loginService, 'signInOrUpUser').mockImplementation(signInOrUpUserResult);
  return handler(event, c);
}

/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["assert"] }] */
function assert(
  result: APIGatewayProxyStructuredResultV2,
  expectation: APIGatewayProxyStructuredResultV2
): void {
  expect(result.statusCode).toEqual(expectation.statusCode);
  expect(result.body).toEqual(expectation.body);
  expect(result.headers?.['Set-Authorization']).toEqual(expectation.headers?.['Set-Authorization']);
  expect(result.headers?.['Set-Refresh-Token']).toEqual(expectation.headers?.['Set-Refresh-Token']);
}

const defaultEnv: LoginConfig = {
  privateKey: `some_fake_private_key`,
  jwt: {
    algorithm: 'ES256',
    issuer: 'test@notifycal.com',
    expiresIn: '5m'
  },
  googleClientId: '658640078137-omuaokg6rcajv50879674moielbpvljl.apps.googleusercontent.com',
  userProvider: {
    tableName: 'Users-local',
    awsConfig: {
      awsRegion: 'eu-west-1',
      endpoint: 'http://localhost:4566',
      credentials: {
        accessKeyId: 'foo',
        secretAccessKey: 'bar'
      }
    }
  }
};

function setEnv(config: LoginConfig) {
  process.env.JWT_PRIVATE_KEY = config.privateKey;
  process.env.JWT_ALGORITHM = config.jwt.algorithm;
  process.env.JWT_ISSUER = config.jwt.issuer;
  process.env.JWT_EXPIRATION = config.jwt.expiresIn;
  process.env.GOOGLE_CLIENT_ID = config.googleClientId;
  process.env.POWERTOOLS_DEV = 'true';
  process.env.USERS_TABLE_NAME = config.userProvider.tableName;
  process.env.AWS_REGION = config.userProvider.awsConfig.awsRegion;
  process.env.AWS_ENDPOINT_URL = config.userProvider.awsConfig.endpoint;
  process.env.AWS_ACCESS_KEY_ID = config.userProvider.awsConfig.credentials?.accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = config.userProvider.awsConfig.credentials?.secretAccessKey;
}
