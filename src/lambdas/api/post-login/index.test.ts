import { describe, jest } from '@jest/globals';
import { LoginConfig } from './config';
import { handler } from './index';
import * as loginService from '@services/login';
import * as googleOAuth from '@services/google-oauth';
import * as jwt from '@services/jwt';
import { type APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { c, testEvent, unsafeTestEvent } from '@testing/apigateway';
import { User } from '@model/User';
import { Email } from '@own-types/model';
import { assert } from '@testing/utils/assertions';
import {
  setEnvAwsConfig,
  setEnvEncodeAccessJwtConfig,
  setEnvEncodeRefreshJwtConfig,
  setEnvRefreshTokenBaseStoreConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { RefreshTokenBaseStore } from '@services/refresh-token-base-store';
import { responseError, responseSuccess } from '@services/common/api-response-handlers';
describe('Login', () => {
  const validJwts: jwt.EncodedAndDecodedJwts = {
    accessToken: {
      encoded: 'some_valid_access_jwt',
      decoded: {
        header: {
          alg: 'ES256',
          typ: 'JWT'
        },
        payload: {
          email: 'test@notifycal.com',
          role: 'user',
          permissions: {},
          iat: 1735311407,
          exp: 1735512345,
          aud: 'local.notifycal.com',
          iss: 'local.notifycal.com',
          sub: 'SomeSubjectIdentifyingTheUser',
          jti: '9999999-d54b-4f70-90e1-59c02d0e7a02'
        },
        signature: 'some_signature'
      }
    },
    refreshToken: {
      encoded: 'some_valid_refresh_jwt',
      decoded: {
        header: {
          alg: 'ES256',
          typ: 'JWT'
        },
        payload: {
          iat: 1735311407,
          exp: 1735599999,
          aud: 'local.notifycal.com',
          iss: 'local.notifycal.com',
          sub: 'SomeSubjectIdentifyingTheUser',
          jti: '8888888-d54b-4f70-90e1-59c02d0e7a02'
        },
        signature: 'some_signature'
      }
    }
  };

  it('should sign up a user', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const buildJwtsFn = () => Promise.resolve(validJwts);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });
    const putRefreshTokenFn = () => Promise.resolve(null);

    return testit(
      event,
      idTokenVerificationFn,
      buildJwtsFn,
      signInOrUpUserFn,
      putRefreshTokenFn
    ).then((resp) => {
      assert(
        resp,
        responseSuccess({
          accessToken: validJwts.accessToken.encoded,
          tokenType: 'Bearer',
          refreshToken: validJwts.refreshToken.encoded
        })
      );
    });
  });

  it('should sign in a user', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const buildJwtsFn1 = () => Promise.resolve(validJwts);
    const validJwts2: jwt.EncodedAndDecodedJwts = {
      accessToken: {
        encoded: 'some_valid_access_jwt2',
        decoded: {
          header: {
            alg: 'ES256',
            typ: 'JWT'
          },
          payload: {
            email: 'test@notifycal.com',
            role: 'user',
            permissions: {},
            iat: 1735311407,
            exp: 1735512345,
            aud: 'local.notifycal.com',
            iss: 'local.notifycal.com',
            sub: 'SomeSubjectIdentifyingTheUser',
            jti: '9999999-d54b-4f70-90e1-59c02d0e7a02'
          },
          signature: 'some_signature'
        }
      },
      refreshToken: {
        encoded: 'some_valid_refresh_jwt2',
        decoded: {
          header: {
            alg: 'ES256',
            typ: 'JWT'
          },
          payload: {
            iat: 1735311407,
            exp: 1735599999,
            aud: 'local.notifycal.com',
            iss: 'local.notifycal.com',
            sub: 'SomeSubjectIdentifyingTheUser',
            jti: '8888888-d54b-4f70-90e1-59c02d0e7a02'
          },
          signature: 'some_signature'
        }
      }
    };
    const buildJwtsFn2 = () => Promise.resolve(validJwts2);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });
    const putRefreshTokenFn = () => Promise.resolve(null);

    return testit(
      event,
      idTokenVerificationFn,
      buildJwtsFn1,
      signInOrUpUserFn,
      putRefreshTokenFn
    ).then(() =>
      testit(event, idTokenVerificationFn, buildJwtsFn2, signInOrUpUserFn, putRefreshTokenFn).then(
        (resp) =>
          assert(
            resp,
            responseSuccess({
              accessToken: validJwts2.accessToken.encoded,
              tokenType: 'Bearer',
              refreshToken: validJwts2.refreshToken.encoded
            })
          )
      )
    );
  });

  it('should fail id token verification with 401', () => {
    const event = testEvent({
      'google-code': '<SOME-INCORRECT-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'failure@notifycal.com';
    const idTokenVerificationFn = () => Promise.reject(userEmail);
    const buildJwtsFn = () => Promise.resolve(validJwts);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });
    const putRefreshTokenFn = () => Promise.resolve(null);

    return testit(
      event,
      idTokenVerificationFn,
      buildJwtsFn,
      signInOrUpUserFn,
      putRefreshTokenFn
    ).then((resp) => assert(resp, responseError(401)));
  });

  it('should fail input validation with 400', () => {
    const event = unsafeTestEvent({
      'incorrect-field': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const buildJwtsFn = () => Promise.resolve(validJwts);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });
    const putRefreshTokenFn = () => Promise.resolve(null);

    return testit(
      event,
      idTokenVerificationFn,
      buildJwtsFn,
      signInOrUpUserFn,
      putRefreshTokenFn
    ).then((resp) => assert(resp, responseError(400)));
  });

  it('should fail to generate JWT with 500', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const buildJwtsFn = () => Promise.reject('Boooom!');
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });
    const putRefreshTokenFn = () => Promise.resolve(null);

    return testit(
      event,
      idTokenVerificationFn,
      buildJwtsFn,
      signInOrUpUserFn,
      putRefreshTokenFn
    ).then((resp) => assert(resp, responseError(500)));
  });

  it('should fail if environment is not set correctly with 500', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const buildJwtsFn = () => Promise.resolve(validJwts);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });
    const putRefreshTokenFn = () => Promise.resolve(null);
    const env = structuredClone(defaultEnv);
    env.googleOAuthClientConfig.clientId = undefined as unknown as string;

    return testit(
      event,
      idTokenVerificationFn,
      buildJwtsFn,
      signInOrUpUserFn,
      putRefreshTokenFn,
      env
    ).then((resp) => assert(resp, responseError(500)));
  });

  it('should fail if user cannot sign in or up with 500', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const buildJwtsFn = () => Promise.resolve(validJwts);
    const signInOrUpUserFn = () => Promise.reject('Error to sign in or up a user');
    const putRefreshTokenFn = () => Promise.resolve(null);

    return testit(
      event,
      idTokenVerificationFn,
      buildJwtsFn,
      signInOrUpUserFn,
      putRefreshTokenFn
    ).then((resp) => {
      assert(resp, responseError(500));
    });
  });

  it('should fail if refresh token cannot be stored with 500', () => {
    const event = testEvent({
      'google-code': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEventV2;
    const userEmail = 'success@notifycal.com';
    const idTokenVerificationFn = () => Promise.resolve(userEmail);
    const buildJwtsFn = () => Promise.resolve(validJwts);
    const signInOrUpUserFn = () => Promise.resolve({ UserId: userEmail });
    const putRefreshTokenFn = () => Promise.reject('Boom!');

    return testit(
      event,
      idTokenVerificationFn,
      buildJwtsFn,
      signInOrUpUserFn,
      putRefreshTokenFn
    ).then((resp) => {
      assert(resp, responseError(500));
    });
  });
});

function testit(
  event: APIGatewayProxyEventV2,
  idTokenVerificationFn: () => Promise<Email>,
  buildJwtsFn: () => Promise<jwt.EncodedAndDecodedJwts>,
  signInOrUpUserFn: () => Promise<User>,
  putRefreshTokenFn: () => Promise<null>,
  env: LoginConfig = defaultEnv
): Promise<APIGatewayProxyStructuredResultV2> {
  setEnv(env);
  jest.spyOn(googleOAuth, 'verifyGoogleIdentity').mockImplementation(idTokenVerificationFn);
  jest.spyOn(jwt, 'buildJwts').mockImplementation(buildJwtsFn);
  jest.spyOn(RefreshTokenBaseStore.prototype, 'putToken').mockImplementation(putRefreshTokenFn);
  jest.spyOn(loginService, 'signInOrUpUser').mockImplementation(signInOrUpUserFn);
  return handler(event, c);
}

const defaultEnv: LoginConfig = {
  encodeAccessJwtConfig: {
    privateKey: `some_fake_private_key`,
    algorithm: 'ES256',
    issuer: 'test@notifycal.com',
    audience: 'test@notifycal.com',
    expiresIn: '5m'
  },
  encodeRefreshJwtConfig: {
    privateKey: `some_other_fake_private_key`,
    algorithm: 'ES256',
    issuer: 'test@notifycal.com',
    audience: 'test@notifycal.com',
    expiresIn: '7d'
  },
  googleOAuthClientConfig: {
    clientId: 'some_valid_google_app_url',
    clientSecret: 'some_valid_secret',
    redirectUri: 'http://localhost:5173'
  },
  userBaseStoreConfig: {
    tableName: 'Users-local'
  },
  refreshTokenBaseStoreConfig: {
    tableName: 'RefreshTokens-local'
  },
  awsConfig: {
    awsRegion: 'eu-west-1'
  }
};

function setEnv(config: LoginConfig) {
  setEnvEncodeAccessJwtConfig(config.encodeAccessJwtConfig);
  setEnvEncodeRefreshJwtConfig(config.encodeRefreshJwtConfig);
  setEnvGoogleOAuthClientConfig(config.googleOAuthClientConfig);
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
  setEnvRefreshTokenBaseStoreConfig(config.refreshTokenBaseStoreConfig);
  setEnvAwsConfig(config.awsConfig);
}

function setEnvGoogleOAuthClientConfig(config: googleOAuth.GoogleOAuthConfig) {
  process.env.GOOGLE_OAUTH_CLIENT_ID = config.clientId;
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = config.clientSecret;
  process.env.GOOGLE_OAUTH_CLIENT_REDIRECT_URI = config.redirectUri;
}
