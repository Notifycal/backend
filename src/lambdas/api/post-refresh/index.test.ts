import { describe, jest } from '@jest/globals';
import { handler } from './index';
import * as jwt from '@services/jwt';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { c, testEvent } from '@testing/apigateway';
import {
  setEnvAwsConfig,
  setEnvDecodeRefreshJwtConfig,
  setEnvEncodeAccessJwtConfig,
  setEnvEncodeRefreshJwtConfig,
  setEnvRefreshTokenBaseStoreConfig
} from '@testing/utils/config';
import { assert } from '@testing/utils/assertions';
import type { RefreshConfig } from './config';
import type { RefreshTokenStoreRecord } from '@model/RefreshTokenStoreRecord';
import type { RefreshToken } from '@model/Jwt';
import { responseError, responseSuccess } from '@services/common/api-response-handlers';
import { RefreshTokenBaseStore } from '@services/refresh-token-base-store';

describe('Refresh', () => {
  it('should renew both tokens', () => {
    const event = testEvent({
      refreshToken: validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getRefreshTokenByFn = () => Promise.resolve(validRefreshTokenStoreRecord);
    const buildJwtsFn = () => Promise.resolve(validEncodedAndDecodedJwts);
    const putRefreshTokenFn = () => Promise.resolve(null);

    return testit(
      event,
      getRefreshTokenByFn,
      putRefreshTokenFn,
      decodeAndVerifyJwtSignatureFn,
      buildJwtsFn
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
    const buildJwtsFn = () => Promise.resolve(validEncodedAndDecodedJwts);
    const putRefreshTokenFn = () => Promise.resolve(null);

    return testit(
      event,
      getRefreshTokenByFn,
      putRefreshTokenFn,
      decodeAndVerifyJwtSignatureFn,
      buildJwtsFn
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
    const buildJwtsFn = () => Promise.resolve(validEncodedAndDecodedJwts);
    const putRefreshTokenFn = () => Promise.resolve(null);

    return testit(
      event,
      getRefreshTokenByFn,
      putRefreshTokenFn,
      decodeAndVerifyJwtSignatureFn,
      buildJwtsFn
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
    const buildJwtsFn = () => Promise.resolve(validEncodedAndDecodedJwts);
    const putRefreshTokenFn = () => Promise.resolve(null);

    return testit(
      event,
      getRefreshTokenByFn,
      putRefreshTokenFn,
      decodeAndVerifyJwtSignatureFn,
      buildJwtsFn
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
    const buildJwtsFn = () => Promise.resolve(validEncodedAndDecodedJwts);
    const putRefreshTokenFn = () => Promise.resolve(null);

    return testit(
      event,
      getRefreshTokenByFn,
      putRefreshTokenFn,
      decodeAndVerifyJwtSignatureFn,
      buildJwtsFn
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
    const buildJwtsFn = () => Promise.resolve(validEncodedAndDecodedJwts);
    const putRefreshTokenFn = () => Promise.resolve(null);

    return testit(
      event,
      getRefreshTokenByFn,
      putRefreshTokenFn,
      decodeAndVerifyJwtSignatureFn,
      buildJwtsFn
    ).then((resp) => {
      assert(resp, responseError(403));
    });
  });
  it('fail if new tokens cannot be generated with 500', () => {
    const event = testEvent({
      refreshToken: validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getRefreshTokenByFn = () => Promise.resolve(validRefreshTokenStoreRecord);
    const buildJwtsFn = () => Promise.reject(new Error('Boom!'));
    const putRefreshTokenFn = () => Promise.resolve(null);

    return testit(
      event,
      getRefreshTokenByFn,
      putRefreshTokenFn,
      decodeAndVerifyJwtSignatureFn,
      buildJwtsFn
    ).then((resp) => {
      assert(resp, responseError(500));
    });
  });
  it('fail if new refresh token cannot be stored with 500', () => {
    const event = testEvent({
      refreshToken: validRefreshToken
    }) as unknown as APIGatewayProxyEvent;

    const decodeAndVerifyJwtSignatureFn = () => Promise.resolve(validInitialDecodedRefreshToken);
    const getRefreshTokenByFn = () => Promise.resolve(validRefreshTokenStoreRecord);
    const buildJwtsFn = () => Promise.resolve(validEncodedAndDecodedJwts);
    const putRefreshTokenFn = () => Promise.reject(new Error('Booom!'));

    return testit(
      event,
      getRefreshTokenByFn,
      putRefreshTokenFn,
      decodeAndVerifyJwtSignatureFn,
      buildJwtsFn
    ).then((resp) => {
      assert(resp, responseError(500));
    });
  });

  function testit(
    event: APIGatewayProxyEvent,
    getRefreshTokenByFn: () => Promise<RefreshTokenStoreRecord | undefined>,
    putRefreshTokenFn: () => Promise<null>,
    decodeAndVerifyJwtSignatureFn: () => Promise<RefreshToken>,
    buildJwtsFn: () => Promise<jwt.EncodedAndDecodedJwts>,
    env: RefreshConfig = defaultEnv
  ): Promise<APIGatewayProxyResult> {
    setEnv(env);
    jest
      .spyOn(RefreshTokenBaseStore.prototype, 'getTokenBy')
      .mockImplementation(getRefreshTokenByFn);
    jest.spyOn(RefreshTokenBaseStore.prototype, 'putToken').mockImplementation(putRefreshTokenFn);
    jest
      .spyOn(jwt, 'decodeAndVerifyJwtSignature')
      .mockImplementation(decodeAndVerifyJwtSignatureFn);
    jest.spyOn(jwt, 'buildJwts').mockImplementation(buildJwtsFn);
    return handler(event, c);
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
    awsConfig: {
      awsRegion: 'eu-west-1'
    }
  };

  function setEnv(config: RefreshConfig) {
    setEnvEncodeAccessJwtConfig(config.encodeAccessJwtConfig);
    setEnvEncodeRefreshJwtConfig(config.encodeRefreshJwtConfig);
    setEnvDecodeRefreshJwtConfig(config.decodeRefreshJwtConfig);
    setEnvRefreshTokenBaseStoreConfig(config.refreshTokenBaseStoreConfig);
    setEnvAwsConfig(config.awsConfig);
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

const validEncodedAndDecodedJwts: jwt.EncodedAndDecodedJwts = {
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
