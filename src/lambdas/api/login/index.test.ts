import { describe, expect, jest } from '@jest/globals';
import { LoginConfig } from './config';
import { handler, type Payload } from './index';
import * as loginService from '@services/login';
import * as googleOAuth from '@services/google-oauth';
import * as jwt from '@services/jwt';
import { type APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { c, testEvent, unsafeTestEvent } from '@testing/apigateway';
import type { ParsedResult } from '@aws-lambda-powertools/parser/types';
import { User } from '@model/User';
import { Jwt, Email } from '@own-types/model';

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
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as ParsedResult<APIGatewayProxyEventV2, Payload>;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const validJwt = 'some_valid_jwt';
    const jwtBuildFn = () => Promise.resolve(validJwt);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn).then((resp) => {
      assert(resp, {
        statusCode: 200,
        body: JSON.stringify({
          accessToken: validJwt,
          tokenType: 'Bearer',
          refreshToken: 'WIP'
        })
      });
    });
  });

  it('should sign in a user', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
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
          body: JSON.stringify({
            accessToken: validJwt2,
            tokenType: 'Bearer',
            refreshToken: 'WIP'
          })
        })
      )
    );
  });

  it('should fail id token verification with 401', () => {
    const event = testEvent({
      'google-code': '<SOME-INCORRECT-GOOGLE-ID-TOKEN>'
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

  it('should fail input validation with 400', () => {
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
        statusCode: 400,
        body: 'Bad Request'
      })
    );
  });

  it('should fail to generate JWT with 500', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
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
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as ParsedResult<APIGatewayProxyEventV2, Payload>;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const jwtBuildFn = () => Promise.resolve('JWT build error');
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });
    const env = {
      ...defaultEnv,
      googleOAuthClient: {
        clientId: undefined as unknown as string
      }
    } as LoginConfig;

    return testit(event, idTokenVerificationFn, jwtBuildFn, signInOrUpUserFn, env).then((resp) =>
      assert(resp, {
        statusCode: 500,
        body: 'KO'
      })
    );
  });

  it('should fail if user cannot sign in or up with 500', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
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
  jest.spyOn(googleOAuth, 'verifyGoogleIdentity').mockImplementation(idTokenVerificationResult);
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
}

const defaultEnv: LoginConfig = {
  privateKey: `some_fake_private_key`,
  jwt: {
    algorithm: 'ES256',
    issuer: 'test@notifycal.com',
    expiresIn: '5m'
  },
  googleOAuthClient: {
    clientId: '658640078137-omuaokg6rcajv50879674moielbpvljl.apps.googleusercontent.com',
    clientSecret: 'some_valid_secret',
    redirectUri: 'http://localhost:5173'
  },
  userProvider: {
    tableName: 'Users-local'
  },
  awsConfig: {
    awsRegion: 'eu-west-1'
  }
};

function setEnv(config: LoginConfig) {
  process.env.JWT_PRIVATE_KEY = config.privateKey;
  process.env.JWT_ALGORITHM = config.jwt.algorithm;
  process.env.JWT_ISSUER = config.jwt.issuer;
  process.env.JWT_EXPIRATION = config.jwt.expiresIn;
  process.env.GOOGLE_OAUTH_CLIENT_ID = config.googleOAuthClient.clientId;
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = config.googleOAuthClient.clientSecret;
  process.env.GOOGLE_OAUTH_CLIENT_REDIRECT_URI = config.googleOAuthClient.redirectUri;
  process.env.POWERTOOLS_DEV = 'true';
  process.env.USERS_TABLE_NAME = config.userProvider.tableName;
  process.env.AWS_REGION = config.awsConfig.awsRegion;
}
