import type { Algorithm } from '@model/Config';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type {
  Email,
  Identity,
  IdpId,
  IdpName,
  Jwt,
  UnixTimestamp,
  Uuid
} from '@notifycal/shared/types';
import type { AwsArn, PrivateKey } from '@own-types/model';
import { signInOrUp } from '@services/auth';
import { GoogleOAuth } from '@services/google/oauth';
import type { EncodedAndDecodedJwts } from '@services/jwt';
import { c, testEvent, unsafeTestEvent } from '@testing/data/apigateway';
import { resetTestingContext } from '@testing/setup-tests';
import {
  responseError,
  responseErrorNoCorsHeaders,
  responseSuccess
} from '@testing/utils/api-response-handlers';
import { assert } from '@testing/utils/assertions';
import {
  fakeIdpConfigs,
  setEnvApiRestTopicConfig,
  setEnvBaseConfig,
  setEnvEncodeAccessJwtConfig,
  setEnvEncodeRefreshJwtConfig,
  setEnvIdpConfigs,
  setEnvRefreshTokenBaseStoreConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { validJwts } from '@testing/utils/jwt';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { describe, it, vi } from 'vitest';
import type { LoginConfig } from './config';
// @ts-expect-error cjs handler export
import { handler, type Event } from './index';

describe('POST Login', () => {
  const userEmail = 'test@notifycal.com' as Email;
  const validUserId = validJwts.accessToken.decoded.payload.userId;
  const validIdentity: Identity<'google.com'> = {
    userId: validJwts.accessToken.decoded.payload.userId,
    email: userEmail,
    idp: 'google.com',
    idpId: '12a46f95-91dc-4708-bcab-087afafb89de' as IdpId
  };
  const validAuthorization: AuthorizationForIdp<'google.com'> = {
    refreshToken: 'some_google_refressssh_token'
  };
  const validVerifyGoogleIdentityFn = (): Promise<
    [Identity<'google.com'>, AuthorizationForIdp<'google.com'>]
  > => Promise.resolve([validIdentity, validAuthorization]);
  const validQueryParams = {
    idp: 'google.com'
  };

  it('should sign up a user', () => {
    const event = testEvent(
      {
        googleCode: '<SOME-FAKE-GOOGLE-ID-TOKEN>'
      },
      {},
      validQueryParams
    ) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = validVerifyGoogleIdentityFn;
    const signInOrUpUserFn = () => Promise.resolve(validJwts);

    return testit(event, verifyGoogleIdentityFn, signInOrUpUserFn).then((resp) => {
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
    const event = testEvent(
      {
        googleCode: '<SOME-FAKE-GOOGLE-ID-TOKEN>'
      },
      {},
      validQueryParams
    ) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = validVerifyGoogleIdentityFn;
    const signInOrUpUserFn1 = () => Promise.resolve(validJwts);
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
    const signInOrUpUserFn2 = () => Promise.resolve(validJwts2);

    return testit(event, verifyGoogleIdentityFn, signInOrUpUserFn1).then(() => {
      resetTestingContext();
      return testit(event, verifyGoogleIdentityFn, signInOrUpUserFn2).then((resp) => {
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
    const event = testEvent(
      {
        googleCode: '<SOME-INCORRECT-GOOGLE-ID-TOKEN>'
      },
      {},
      validQueryParams
    ) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = () => Promise.reject(new Error('The identity was not valid'));
    const signInOrUpUserFn = () => Promise.resolve(validJwts);

    return testit(event, verifyGoogleIdentityFn, signInOrUpUserFn).then((resp) => {
      assert(resp, responseError(401));
    });
  });

  it('should fail input validation with 400', () => {
    const event = unsafeTestEvent(
      {
        'incorrect-field': '<SOME-FAKE-GOOGLE-ID-TOKEN>'
      },
      {},
      validQueryParams
    ) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = validVerifyGoogleIdentityFn;
    const signInOrUpUserFn = () => Promise.resolve(validJwts);

    return testit(event, verifyGoogleIdentityFn, signInOrUpUserFn).then((resp) => {
      assert(resp, responseError(400));
    });
  });

  it('should fail if environment is not set correctly with 500', () => {
    const event = testEvent(
      {
        googleCode: '<SOME-FAKE-GOOGLE-ID-TOKEN>'
      },
      {},
      validQueryParams
    ) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = validVerifyGoogleIdentityFn;
    const signInOrUpUserFn = () => Promise.resolve(validJwts);
    const env = structuredClone(defaultEnv);
    env.idpConfigs['google.com'].clientId = undefined as unknown as string;

    return testit(event, verifyGoogleIdentityFn, signInOrUpUserFn, env).then((resp) => {
      assert(resp, responseErrorNoCorsHeaders(500));
    });
  });

  it('should fail if user cannot sign in or up with 500', () => {
    const event = testEvent(
      {
        googleCode: '<SOME-FAKE-GOOGLE-ID-TOKEN>'
      },
      {},
      validQueryParams
    ) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = validVerifyGoogleIdentityFn;
    const signInOrUpUserFn = () => Promise.reject(new Error('Error to sign in or up a user'));

    return testit(event, verifyGoogleIdentityFn, signInOrUpUserFn).then((resp) => {
      assert(resp, responseError(500));
    });
  });

  it('should fail if query param idp does not match an implemented one with 401', () => {
    const event = testEvent(
      {
        googleCode: '<SOME-FAKE-GOOGLE-ID-TOKEN>'
      },
      {},
      {
        idp: 'other-idp.es'
      }
    ) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = validVerifyGoogleIdentityFn;
    const signInOrUpUserFn = () => Promise.resolve(validJwts);

    return testit(event, verifyGoogleIdentityFn, signInOrUpUserFn).then((resp) => {
      assert(resp, responseError(401));
    });
  });

  it('should fail if idp query param is missing with 401', () => {
    const event = testEvent(
      {
        googleCode: '<SOME-FAKE-GOOGLE-ID-TOKEN>'
      },
      {},
      {}
    ) as unknown as APIGatewayProxyEvent;
    const verifyGoogleIdentityFn = validVerifyGoogleIdentityFn;
    const signInOrUpUserFn = () => Promise.resolve(validJwts);

    return testit(event, verifyGoogleIdentityFn, signInOrUpUserFn).then((resp) => {
      assert(resp, responseError(401));
    });
  });
});

async function testit<T extends IdpName>(
  event: APIGatewayProxyEvent,
  verifyGoogleIdentityFn: () => Promise<[Identity<T>, AuthorizationForIdp<T>]>,
  signInOrUpUserFn: () => Promise<EncodedAndDecodedJwts>,
  env: LoginConfig = defaultEnv
): Promise<APIGatewayProxyResult> {
  setEnv(env);
  vi.mock('@services/google/oauth');
  const mockInstance = {
    verifyIdentity: vi.fn().mockImplementation(verifyGoogleIdentityFn)
  };
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(GoogleOAuth.withConfig).mockReturnValue(mockInstance as unknown as GoogleOAuth);

  vi.mock('@services/auth', async () => {
    const realImport = await vi.importActual('@services/auth');
    return {
      signInOrUp: vi.fn(),
      buildJwtsAndStoreRefreshJwt: vi.fn(),
      _successHandler: realImport._successHandler
    };
  });
  vi.mocked(signInOrUp).mockImplementation(signInOrUpUserFn);
  return handler(event as unknown as Event, c);
}

const defaultEnv: LoginConfig = {
  encodeAccessJwtConfig: {
    secretOrPrivateKey: `some_fake_private_key` as PrivateKey,
    algorithm: 'ES256' as Algorithm,
    issuer: 'test@notifycal.com',
    audience: 'test@notifycal.com',
    expiresIn: '5m'
  },
  encodeRefreshJwtConfig: {
    secretOrPrivateKey: `some_other_fake_private_key` as PrivateKey,
    algorithm: 'ES256',
    issuer: 'test@notifycal.com',
    audience: 'test@notifycal.com',
    expiresIn: '7d'
  },
  idpConfigs: fakeIdpConfigs,
  userBaseStoreConfig: {
    tableName: 'Users-local'
  },
  refreshTokenBaseStoreConfig: {
    tableName: 'RefreshTokens-local'
  },
  apiRestTopicConfig: {
    topicArn: 'topic-arn' as AwsArn
  },
  corsConfig: {
    frontendDomain: 'http://localhost:5173'
  }
};

function setEnv(config: LoginConfig) {
  setEnvEncodeAccessJwtConfig(config.encodeAccessJwtConfig);
  setEnvEncodeRefreshJwtConfig(config.encodeRefreshJwtConfig);
  setEnvIdpConfigs(config.idpConfigs);
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
  setEnvRefreshTokenBaseStoreConfig(config.refreshTokenBaseStoreConfig);
  setEnvApiRestTopicConfig(config.apiRestTopicConfig);
  setEnvBaseConfig(config.corsConfig);
}
