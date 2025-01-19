import type { LoginConfig } from './config';
import { handler, type Event } from './index';
import { verifyGoogleIdentity, type GoogleOAuthConfig } from '@services/google-oauth';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { c, testEvent, unsafeTestEvent } from '@testing/apigateway';
import type { User } from '@model/User';
import { assert } from '@testing/utils/assertions';
import {
  setEnvBaseConfig,
  setEnvEncodeAccessJwtConfig,
  setEnvEncodeRefreshJwtConfig,
  setEnvRefreshTokenBaseStoreConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import {
  responseError,
  responseErrorNoCorsHeaders,
  responseSuccess
} from '@testing/utils/api-response-handlers';
import { validUser } from '@testing/utils/model';
import type { EncodedAndDecodedJwts } from '@services/jwt';
import { buildJwtsAndStoreRefreshJwt, signInOrUpUser } from '@services/login';
import { resetTestingContext } from '@testing/setup-tests';
import { describe, it, vi } from 'vitest';
import type { Identity } from '@model/Identity';
import type { Email, IdpId, Jwt, UnixTimestamp, Uuid } from '@own-types/model';
import { validJwts } from '@testing/utils/jwt';

describe('POST Login', () => {
  const userEmail = 'test@notifycal.com' as Email;
  const validUserId = validJwts.accessToken.decoded.payload.userId;
  const validIdentity: Identity = {
    userId: validJwts.accessToken.decoded.payload.userId,
    email: userEmail,
    idp: 'google.com',
    idpId: '12a46f95-91dc-4708-bcab-087afafb89de' as IdpId
  };

  it('should sign up a user', () => {
    const event = testEvent({
      googleCode: '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = () => Promise.resolve(validIdentity);
    const signInOrUpUserFn = () => Promise.resolve(validUser(validIdentity.userId));
    const buildJwtsFn = () => Promise.resolve(validJwts);

    return testit(event, verifyGoogleIdentityFn, signInOrUpUserFn, buildJwtsFn).then((resp) => {
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
      googleCode: '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = () => Promise.resolve(validIdentity);
    const buildJwtsAndStoreRefreshJwtFn1 = () => Promise.resolve(validJwts);
    const validJwts2: EncodedAndDecodedJwts = {
      accessToken: {
        encoded: 'some_valid_access_jwt2' as Jwt,
        decoded: {
          header: {
            alg: 'ES256',
            typ: 'JWT'
          },
          payload: {
            ...validIdentity,
            role: 'user',
            permissions: {},
            iat: 1735311407 as UnixTimestamp,
            exp: 1735512345 as UnixTimestamp,
            aud: 'local.notifycal.com',
            iss: 'local.notifycal.com',
            sub: validUserId,
            jti: '9999999-d54b-4f70-90e1-59c02d0e7a02' as Uuid
          },
          signature: 'some_signature'
        }
      },
      refreshToken: {
        encoded: 'some_valid_refresh_jwt2' as Jwt,
        decoded: {
          header: {
            alg: 'ES256',
            typ: 'JWT'
          },
          payload: {
            iat: 1735311407 as UnixTimestamp,
            exp: 1735599999 as UnixTimestamp,
            aud: 'local.notifycal.com',
            iss: 'local.notifycal.com',
            sub: validUserId,
            jti: '8888888-d54b-4f70-90e1-59c02d0e7a02' as Uuid
          },
          signature: 'some_signature'
        }
      }
    };
    const buildJwtsAndStoreRefreshJwtFn2 = () => Promise.resolve(validJwts2);
    const signInOrUpUserFn = () => Promise.resolve(validUser(validUserId));

    return testit(
      event,
      verifyGoogleIdentityFn,
      signInOrUpUserFn,
      buildJwtsAndStoreRefreshJwtFn1
    ).then(() => {
      resetTestingContext();
      return testit(
        event,
        verifyGoogleIdentityFn,
        signInOrUpUserFn,
        buildJwtsAndStoreRefreshJwtFn2
      ).then((resp) => {
        assert(
          resp,
          responseSuccess({
            accessToken: validJwts2.accessToken.encoded,
            tokenType: 'Bearer',
            refreshToken: validJwts2.refreshToken.encoded
          })
        );
      });
    });
  });

  it('should fail if google identity verification fails with 401', () => {
    const event = testEvent({
      googleCode: '<SOME-INCORRECT-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = () => Promise.reject(new Error('The identity was not valid'));
    const signInOrUpUserFn = () => Promise.resolve(validUser(validUserId));
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validJwts);

    return testit(
      event,
      verifyGoogleIdentityFn,
      signInOrUpUserFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(401));
    });
  });

  it('should fail input validation with 400', () => {
    const event = unsafeTestEvent({
      'incorrect-field': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = () => Promise.resolve(validIdentity);
    const signInOrUpUserFn = () => Promise.resolve(validUser(validUserId));
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validJwts);

    return testit(
      event,
      verifyGoogleIdentityFn,
      signInOrUpUserFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(400));
    });
  });

  it('should fail to generate JWT or store it with 500', () => {
    const event = testEvent({
      googleCode: '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = () => Promise.resolve(validIdentity);
    const signInOrUpUserFn = () => Promise.resolve(validUser(validUserId));
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.reject(new Error('Boooom!'));

    return testit(
      event,
      verifyGoogleIdentityFn,
      signInOrUpUserFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(500));
    });
  });

  it('should fail if environment is not set correctly with 500', () => {
    const event = testEvent({
      googleCode: '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = () => Promise.resolve(validIdentity);
    const signInOrUpUserFn = () => Promise.resolve(validUser(validUserId));
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validJwts);
    const env = structuredClone(defaultEnv);
    env.googleOAuthClientConfig.clientId = undefined as unknown as string;

    return testit(
      event,
      verifyGoogleIdentityFn,
      signInOrUpUserFn,
      buildJwtsAndStoreRefreshJwtFn,
      env
    ).then((resp) => {
      assert(resp, responseErrorNoCorsHeaders(500));
    });
  });

  it('should fail if user cannot sign in or up with 500', () => {
    const event = testEvent({
      googleCode: '<SOME-FAKE-GOOGLE-ID-TOKEN>'
    }) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = () => Promise.resolve(validIdentity);
    const signInOrUpUserFn = () => Promise.reject(new Error('Error to sign in or up a user'));
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validJwts);

    return testit(
      event,
      verifyGoogleIdentityFn,
      signInOrUpUserFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(500));
    });
  });
});

async function testit(
  event: APIGatewayProxyEvent,
  verifyGoogleIdentityFn: () => Promise<Identity>,
  signInOrUpUserFn: () => Promise<User>,
  buildJwtsAndStoreRefreshJwtFn: () => Promise<EncodedAndDecodedJwts>,
  env: LoginConfig = defaultEnv
): Promise<APIGatewayProxyResult> {
  setEnv(env);
  vi.mock('@services/google-oauth', () => ({
    verifyGoogleIdentity: vi.fn()
  }));
  vi.mocked(verifyGoogleIdentity).mockImplementation(verifyGoogleIdentityFn);
  vi.mock('@services/login', async () => {
    const realImport = await vi.importActual('@services/login');
    return {
      signInOrUpUser: vi.fn(),
      buildJwtsAndStoreRefreshJwt: vi.fn(),
      _successHandler: realImport._successHandler
    };
  });
  vi.mocked(signInOrUpUser).mockImplementation(signInOrUpUserFn);
  vi.mocked(buildJwtsAndStoreRefreshJwt).mockImplementation(buildJwtsAndStoreRefreshJwtFn);
  return handler(event as unknown as Event, c);
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
  baseConfig: {
    frontendDomain: 'http://localhost:5173'
  }
};

function setEnv(config: LoginConfig) {
  setEnvEncodeAccessJwtConfig(config.encodeAccessJwtConfig);
  setEnvEncodeRefreshJwtConfig(config.encodeRefreshJwtConfig);
  setEnvGoogleOAuthClientConfig(config.googleOAuthClientConfig);
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
  setEnvRefreshTokenBaseStoreConfig(config.refreshTokenBaseStoreConfig);
  setEnvBaseConfig(config.baseConfig);
}

function setEnvGoogleOAuthClientConfig(config: GoogleOAuthConfig) {
  process.env.GOOGLE_OAUTH_CLIENT_ID = config.clientId;
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = config.clientSecret;
  process.env.GOOGLE_OAUTH_CLIENT_REDIRECT_URI = config.redirectUri;
}
