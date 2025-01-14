import { handler, type Event } from './index';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { c, testEvent } from '@testing/apigateway';
import {
  setEnvBaseConfig,
  setEnvDecodeRefreshJwtConfig,
  setEnvEncodeAccessJwtConfig,
  setEnvEncodeRefreshJwtConfig,
  setEnvRefreshTokenBaseStoreConfig
} from '@testing/utils/config';
import { assert } from '@testing/utils/assertions';
import type { RefreshConfig } from './config';
import type { RefreshTokenStoreRecord } from '@model/RefreshTokenStoreRecord';
import type { RefreshToken } from '@model/Jwt';
import { responseError, responseSuccess } from '@testing/utils/api-response-handlers';
import { decodeAndVerifyJwtSignature, type EncodedAndDecodedJwts } from '@services/jwt';
import { buildJwtsAndStoreRefreshJwt } from '@services/login';
import { RefreshTokenBaseStore } from '@services/refresh-token-base-store';
import { describe, it, vi } from 'vitest';

describe('POST Refresh', () => {
  it('should renew both tokens', () => {
    const event = testEvent({
      refreshToken: validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getRefreshTokenByFn = () => Promise.resolve(validRefreshTokenStoreRecord);
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validEncodedAndDecodedJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getRefreshTokenByFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(
        resp,
        responseSuccess({
          accessToken: validEncodedAndDecodedJwts.accessToken.encoded,
          tokenType: 'Bearer',
          refreshToken: validEncodedAndDecodedJwts.refreshToken.encoded
        })
      );
    });
  });

  it('fail if request payload is invalid with 400', () => {
    const event = testEvent({
      'unexpected-field': validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getRefreshTokenByFn = () => Promise.resolve(validRefreshTokenStoreRecord);
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validEncodedAndDecodedJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getRefreshTokenByFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(400));
    });
  });

  it('fail if refresh token provided cannot be verified with 401', () => {
    const event = testEvent({
      refreshToken: validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.reject(new Error('Boom!'));
    const getRefreshTokenByFn = () => Promise.resolve(validRefreshTokenStoreRecord);
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validEncodedAndDecodedJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getRefreshTokenByFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(401));
    });
  });

  it('fail if refresh token is not longer present in storage with 403', () => {
    const event = testEvent({
      refreshToken: validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getRefreshTokenByFn = () => Promise.resolve(undefined);
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validEncodedAndDecodedJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getRefreshTokenByFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(403));
    });
  });

  it('fail if refresh token cannot be obtained from storage with 500', () => {
    const event = testEvent({
      refreshToken: validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getRefreshTokenByFn = () => Promise.reject(new Error('Boom!'));
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validEncodedAndDecodedJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getRefreshTokenByFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(500));
    });
  });

  it('fail if refresh token provided does not match with refresh token stored with 403', () => {
    const event = testEvent({
      refreshToken: validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getRefreshTokenByFn = () =>
      Promise.resolve({ ...validRefreshTokenStoreRecord, RefreshToken: 'this one does not match' });
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validEncodedAndDecodedJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getRefreshTokenByFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(403));
    });
  });

  it('fail if new tokens cannot be generated or stored with 500', () => {
    const event = testEvent({
      refreshToken: validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getRefreshTokenByFn = () => Promise.resolve(validRefreshTokenStoreRecord);
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.reject(new Error('Boom!'));

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getRefreshTokenByFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(500));
    });
  });

  async function testit(
    event: APIGatewayProxyEvent,
    decodeAndVerifyJwtSignatureFn: () => Promise<RefreshToken>,
    getRefreshTokenByFn: () => Promise<RefreshTokenStoreRecord | undefined>,
    buildJwtsAndStoreRefreshJwtFn: () => Promise<EncodedAndDecodedJwts>,
    env: RefreshConfig = defaultEnv
  ): Promise<APIGatewayProxyResult> {
    setEnv(env);
    vi.mock('@services/jwt', () => ({
      decodeAndVerifyJwtSignature: vi.fn()
    }));
    vi.mocked(decodeAndVerifyJwtSignature).mockImplementation(decodeAndVerifyJwtSignatureFn);
    vi.mock('@services/refresh-token-base-store', () => {
      const RefreshTokenBaseStore = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      RefreshTokenBaseStore.prototype.getTokenBy = vi.fn();
      return {
        RefreshTokenBaseStore
      };
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(RefreshTokenBaseStore.prototype.getTokenBy).mockImplementation(getRefreshTokenByFn);
    vi.mock('@services/login', async () => {
      const realImport = await vi.importActual('@services/login');
      return {
        signInOrUpUser: vi.fn(),
        buildJwtsAndStoreRefreshJwt: vi.fn(),
        _successHandler: realImport._successHandler
      };
    });
    vi.mocked(buildJwtsAndStoreRefreshJwt).mockImplementation(buildJwtsAndStoreRefreshJwtFn);
    return handler(event as unknown as Event, c);
  }

  const defaultEnv: RefreshConfig = {
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
    decodeRefreshJwtConfig: {
      publicKey: `some_other_fake_public_key`,
      issuer: 'test@notifycal.com',
      audience: 'test@notifycal.com',
      expiresIn: '7d'
    },
    refreshTokenBaseStoreConfig: {
      tableName: 'Users-local'
    },
    baseConfig: {
      frontendDomain: 'http://localhost:5173'
    }
  };

  function setEnv(config: RefreshConfig) {
    setEnvEncodeAccessJwtConfig(config.encodeAccessJwtConfig);
    setEnvEncodeRefreshJwtConfig(config.encodeRefreshJwtConfig);
    setEnvDecodeRefreshJwtConfig(config.decodeRefreshJwtConfig);
    setEnvRefreshTokenBaseStoreConfig(config.refreshTokenBaseStoreConfig);
    setEnvBaseConfig(config.baseConfig);
  }
});

const validInitialDecodedRefreshToken = {
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
    jti: '9999999-d54b-4f70-90e1-59c02d0e7a02'
  },
  signature: 'some_signature'
};
const userEmail = 'success@notifycal.com';
const validRefreshToken = 'some_valid_refresh_token';
const validRefreshTokenStoreRecord = {
  UserId: userEmail,
  RefreshToken: validRefreshToken,
  RefreshTokenId: 'some_refresh_token_id',
  ExpiresAt: 123456789
};

const validEncodedAndDecodedJwts: EncodedAndDecodedJwts = {
  accessToken: {
    encoded: 'some_valid_access_token',
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
    encoded: validRefreshToken,
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
