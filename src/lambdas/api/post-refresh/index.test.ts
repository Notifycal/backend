import type { Algorithm } from '@model/Config';
import type { RefreshToken } from '@model/Jwt';
import type { RefreshTokenStoreRecord } from '@model/store/RefreshTokenStoreRecord';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type { IdpName, Jwt, UnixTimestamp, Uuid } from '@notifycal/shared/types';
import type { PrivateKey, PublicKey } from '@own-types/model';
import { buildJwtsAndStoreRefreshJwt } from '@services/auth';
import { decodeAndVerifyJwtSignature, type EncodedAndDecodedJwts } from '@services/jwt';
import { RefreshTokenBaseStore } from '@services/stores/refresh-token-base-store';
import { UserBaseStore } from '@services/stores/user-base-store';
import { c, testEvent } from '@testing/data/apigateway';
import { responseError, responseSuccess } from '@testing/utils/api-response-handlers';
import { assert } from '@testing/utils/assertions';
import {
  setEnvBaseConfig,
  setEnvDecodeRefreshJwtConfig,
  setEnvEncodeAccessJwtConfig,
  setEnvEncodeRefreshJwtConfig,
  setEnvRefreshTokenBaseStoreConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { validJwts } from '@testing/utils/jwt';
import { validUserStoreRecord } from '@testing/utils/model';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { describe, it, vi } from 'vitest';
import type { RefreshConfig } from './config';
// @ts-expect-error cjs handler export
import { handler, type Event } from './index';

describe('POST Refresh', () => {
  it('should renew both tokens', () => {
    const event = testEvent({
      refreshToken: validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getUserByEmailFn = () =>
      Promise.resolve(validUserStoreRecord(validRefreshTokenStoreRecord.UserId));
    const getRefreshTokenByFn = () => Promise.resolve(validRefreshTokenStoreRecord);
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getUserByEmailFn,
      getRefreshTokenByFn,
      buildJwtsAndStoreRefreshJwtFn
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

  it('fail if request payload is invalid with 400', () => {
    const event = testEvent({
      'unexpected-field': validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getUserByEmailFn = () =>
      Promise.resolve(validUserStoreRecord(validRefreshTokenStoreRecord.UserId));
    const getRefreshTokenByFn = () => Promise.resolve(validRefreshTokenStoreRecord);
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getUserByEmailFn,
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
    const getUserByEmailFn = () =>
      Promise.resolve(validUserStoreRecord(validRefreshTokenStoreRecord.UserId));
    const getRefreshTokenByFn = () => Promise.resolve(validRefreshTokenStoreRecord);
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getUserByEmailFn,
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
    const getUserByEmailFn = () =>
      Promise.resolve(validUserStoreRecord(validRefreshTokenStoreRecord.UserId));
    const getRefreshTokenByFn = () => Promise.resolve(undefined);
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getUserByEmailFn,
      getRefreshTokenByFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(403));
    });
  });

  it('fail if user could not be found in storage with 403', () => {
    const event = testEvent({
      refreshToken: validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getUserByEmailFn = () => Promise.resolve(undefined);
    const getRefreshTokenByFn = () => Promise.resolve(undefined);
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getUserByEmailFn,
      getRefreshTokenByFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(403));
    });
  });

  it('fail if user retrieval errors with 500', () => {
    const event = testEvent({
      refreshToken: validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getUserByEmailFn = () => Promise.reject(new Error('Booomm!'));
    const getRefreshTokenByFn = () => Promise.resolve(undefined);
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getUserByEmailFn,
      getRefreshTokenByFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(500));
    });
  });

  it('fail if refresh token cannot be obtained from storage with 500', () => {
    const event = testEvent({
      refreshToken: validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getUserByEmailFn = () =>
      Promise.resolve(validUserStoreRecord(validRefreshTokenStoreRecord.UserId));
    const getRefreshTokenByFn = () => Promise.reject(new Error('Boom!'));
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getUserByEmailFn,
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
    const getUserByEmailFn = () =>
      Promise.resolve(validUserStoreRecord(validRefreshTokenStoreRecord.UserId));
    const getRefreshTokenByFn = () =>
      Promise.resolve({
        ...validRefreshTokenStoreRecord,
        RefreshToken: 'this one does not match' as Jwt
      });
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.resolve(validJwts);

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getUserByEmailFn,
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
    const getUserByEmailFn = () =>
      Promise.resolve(validUserStoreRecord(validRefreshTokenStoreRecord.UserId));
    const getRefreshTokenByFn = () => Promise.resolve(validRefreshTokenStoreRecord);
    const buildJwtsAndStoreRefreshJwtFn = () => Promise.reject(new Error('Boom!'));

    return testit(
      event,
      decodeAndVerifyJwtSignatureFn,
      getUserByEmailFn,
      getRefreshTokenByFn,
      buildJwtsAndStoreRefreshJwtFn
    ).then((resp) => {
      assert(resp, responseError(500));
    });
  });

  async function testit(
    event: APIGatewayProxyEvent,
    decodeAndVerifyJwtSignatureFn: () => Promise<RefreshToken>,
    getUserByIdFn: () => Promise<UserStoreRecord<IdpName> | undefined>,
    getRefreshTokenByFn: () => Promise<RefreshTokenStoreRecord | undefined>,
    buildJwtsAndStoreRefreshJwtFn: () => Promise<EncodedAndDecodedJwts>,
    env: RefreshConfig = defaultEnv
  ): Promise<APIGatewayProxyResult> {
    setEnv(env);
    vi.mock('@services/jwt');
    vi.mocked(decodeAndVerifyJwtSignature).mockImplementation(decodeAndVerifyJwtSignatureFn);
    vi.mock('@services/stores/refresh-token-base-store');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(RefreshTokenBaseStore.prototype.getTokenBy).mockImplementation(getRefreshTokenByFn);
    vi.mock('@services/stores/user-base-store');
    const userBaseStoreMock = {
      getUserById: vi.fn().mockImplementation(getUserByIdFn)
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(UserBaseStore.withConfig).mockReturnValue(
      userBaseStoreMock as unknown as UserBaseStore<IdpName>
    );
    vi.mock('@services/auth', async () => {
      const realImport = await vi.importActual('@services/auth');
      return {
        signInOrUp: vi.fn(),
        buildJwtsAndStoreRefreshJwt: vi.fn(),
        _successHandler: realImport._successHandler
      };
    });
    vi.mocked(buildJwtsAndStoreRefreshJwt).mockImplementation(buildJwtsAndStoreRefreshJwtFn);
    return handler(event as unknown as Event, c);
  }

  const defaultEnv: RefreshConfig = {
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
    decodeRefreshJwtConfig: {
      secretOrPublicKey: `some_other_fake_public_key` as PublicKey,
      issuer: 'test@notifycal.com',
      audience: 'test@notifycal.com',
      expiresIn: '7d'
    },
    refreshTokenBaseStoreConfig: {
      tableName: 'RefreshTokens-local'
    },
    userBaseStoreConfig: {
      tableName: 'Users-local'
    },
    corsConfig: {
      frontendDomain: 'http://localhost:5173'
    }
  };

  function setEnv(config: RefreshConfig) {
    setEnvEncodeAccessJwtConfig(config.encodeAccessJwtConfig);
    setEnvEncodeRefreshJwtConfig(config.encodeRefreshJwtConfig);
    setEnvDecodeRefreshJwtConfig(config.decodeRefreshJwtConfig);
    setEnvRefreshTokenBaseStoreConfig(config.refreshTokenBaseStoreConfig);
    setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
    setEnvBaseConfig(config.corsConfig);
  }
});

const validUserId = '1199999-d54b-4f70-90e1-59c02d0e7222' as Uuid;
const validRefreshToken = 'some_valid_refresh_token' as Jwt;
const validInitialDecodedRefreshToken = {
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
    jti: '9999999-d54b-4f70-90e1-59c02d0e7a02' as Uuid
  },
  signature: 'some_signature'
};

const validRefreshTokenStoreRecord = {
  UserId: validUserId,
  RefreshToken: validRefreshToken,
  RefreshTokenId: '6559999-d54b-4f70-90e1-59c02d0e7a02' as Uuid,
  ExpiresAt: 123456789 as UnixTimestamp
};
