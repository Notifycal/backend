import { accessTokenSchema, type OurAccessTokenClaims } from '@model/Jwt';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type { Email, IdpId, IdpName, UserId } from '@notifycal/shared/types';
import { UserBaseStore } from '@services/stores/user-base-store';
import { c, testAuthedEvent } from '@testing/data/apigateway';
import {
  setEnvBaseConfig,
  setEnvDecodeAccessJwtConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { getDefaultDecodeAccessJwtConfig } from '@testing/utils/jwt';
import { validUserStoreRecord } from '@testing/utils/model';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import type { GetUserProfileConfig } from './get-user-profile/config';
// @ts-expect-error cjs handler export
import { handler, type Event } from './get-user-profile/index';

describe('CORS', () => {
  const validIdentity = {
    userId: 'cfaa8471-f4cc-44da-bc22-ddc4b735a847' as UserId,
    email: 'test@notifycal.com' as Email,
    idp: 'google.com' as IdpName,
    idpId: '246534735745767767' as IdpId
  };
  const validAccessToken: OurAccessTokenClaims = {
    ...validIdentity,
    role: 'user',
    permissions: {}
  };

  it('should allow for multiple origins when origin matches first origin', async () => {
    const allowedOrigins = ['http://localhost:8080', 'https://privatedev-2.test.com'];
    const event = (await testAuthedEvent(
      {},
      {
        Origin: allowedOrigins[0]
      },
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserByIdFn = () => Promise.resolve(validUserStoreRecord(validAccessToken.userId));

    return testIt(event, getUserByIdFn, config(allowedOrigins)).then((resp) => {
      expect(resp.statusCode).toBe(200);
      expect(resp.headers).toStrictEqual({
        'Access-Control-Allow-Origin': allowedOrigins[0],
        'Access-Control-Allow-Headers': 'GET,POST,OPTIONS,PUT,DELETE,PATCH',
        'Access-Control-Allow-Methods':
          'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Content-Type': 'application/json',
        Vary: 'Origin, Origin'
      });
    });
  });

  it('should allow for multiple origins when origin matches second origin', async () => {
    const allowedOrigins = ['http://localhost:8080', 'https://privatedev-2.test.com'];
    const event = (await testAuthedEvent(
      {},
      {
        Origin: allowedOrigins[1]
      },
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserByIdFn = () => Promise.resolve(validUserStoreRecord(validAccessToken.userId));

    return testIt(event, getUserByIdFn, config(allowedOrigins)).then((resp) => {
      expect(resp.statusCode).toBe(200);
      expect(resp.headers).toStrictEqual({
        'Access-Control-Allow-Origin': allowedOrigins[1],
        'Access-Control-Allow-Headers': 'GET,POST,OPTIONS,PUT,DELETE,PATCH',
        'Access-Control-Allow-Methods':
          'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Content-Type': 'application/json',
        Vary: 'Origin, Origin'
      });
    });
  });

  it('should return 200 OK but without CORS headers when origin does not match any allowed origin', async () => {
    const allowedOrigins = ['http://localhost:8080', 'https://privatedev-2.test.com'];
    const event = (await testAuthedEvent(
      {},
      {
        Origin: 'https://malicious-site.com'
      },
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserByIdFn = () => Promise.resolve(validUserStoreRecord(validAccessToken.userId));

    return testIt(event, getUserByIdFn, config(allowedOrigins)).then((resp) => {
      expect(resp.statusCode).toBe(200);
      expect(resp.headers).toStrictEqual({ 'Content-Type': 'application/json' });
    });
  });

  it('should return 200 OK but without CORS headers when origin is undefined', async () => {
    const allowedOrigins = ['http://localhost:8080', 'https://privatedev-2.test.com'];
    const event = (await testAuthedEvent(
      {},
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserByIdFn = () => Promise.resolve(validUserStoreRecord(validAccessToken.userId));

    return testIt(event, getUserByIdFn, config(allowedOrigins)).then((resp) => {
      expect(resp.statusCode).toBe(200);
      expect(resp.headers).toStrictEqual({ 'Content-Type': 'application/json' });
    });
  });

  it('should return 400 with empty Allow-Origin in the response when Origin header is null while it should be a string', async () => {
    const allowedOrigins = ['http://localhost:8080', 'https://privatedev-2.test.com'];
    const event = (await testAuthedEvent(
      {},
      {
        Origin: null as unknown as string
      },
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserByIdFn = () => Promise.resolve(validUserStoreRecord(validAccessToken.userId));

    return testIt(event, getUserByIdFn, config(allowedOrigins)).then((resp) => {
      expect(resp.statusCode).toBe(400);
      expect(resp.headers).toStrictEqual({
        'Access-Control-Allow-Origin': '',
        'Access-Control-Allow-Headers': 'GET,POST,OPTIONS,PUT,DELETE,PATCH',
        'Access-Control-Allow-Methods':
          'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Content-Type': 'application/json',
        Vary: 'Origin'
      });
    });
  });

  it('should return 200 OK but without CORS headers when origin is empty string', async () => {
    const allowedOrigins = ['http://localhost:8080', 'https://privatedev-2.test.com'];
    const event = (await testAuthedEvent(
      {},
      {
        Origin: ''
      },
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserByIdFn = () => Promise.resolve(validUserStoreRecord(validAccessToken.userId));

    return testIt(event, getUserByIdFn, config(allowedOrigins)).then((resp) => {
      expect(resp.statusCode).toBe(200);
      expect(resp.headers).toStrictEqual({ 'Content-Type': 'application/json' });
    });
  });

  it('should handle case-sensitive origin matching', async () => {
    const allowedOrigins = ['http://localhost:8080', 'https://privatedev-2.test.com'];
    const event = (await testAuthedEvent(
      {},
      {
        Origin: 'HTTP://LOCALHOST:8080'
      },
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserByIdFn = () => Promise.resolve(validUserStoreRecord(validAccessToken.userId));

    return testIt(event, getUserByIdFn, config(allowedOrigins)).then((resp) => {
      expect(resp.statusCode).toBe(200);
      expect(resp.headers).toStrictEqual({ 'Content-Type': 'application/json' });
    });
  });

  it('should handle partial origin matching rejection', async () => {
    const allowedOrigins = ['http://localhost:8080', 'https://privatedev-2.test.com'];
    const event = (await testAuthedEvent(
      {},
      {
        Origin: 'http://localhost:8080/malicious'
      },
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserByIdFn = () => Promise.resolve(validUserStoreRecord(validAccessToken.userId));

    return testIt(event, getUserByIdFn, config(allowedOrigins)).then((resp) => {
      expect(resp.statusCode).toBe(200);
      expect(resp.headers).toStrictEqual({ 'Content-Type': 'application/json' });
    });
  });

  it('should handle empty allowed origins array', async () => {
    const allowedOrigins: Array<string> = [];
    const event = (await testAuthedEvent(
      {},
      {
        Origin: 'http://localhost:8080'
      },
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserByIdFn = () => Promise.resolve(validUserStoreRecord(validAccessToken.userId));

    return testIt(event, getUserByIdFn, config(allowedOrigins)).then((resp) => {
      expect(resp.statusCode).toBe(200);
      expect(resp.headers).toStrictEqual({ 'Content-Type': 'application/json' });
    });
  });

  it('should handle single allowed origin', async () => {
    const allowedOrigins = ['https://app.notifycal.com'];
    const event = (await testAuthedEvent(
      {},
      {
        Origin: 'https://app.notifycal.com'
      },
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserByIdFn = () => Promise.resolve(validUserStoreRecord(validAccessToken.userId));

    return testIt(event, getUserByIdFn, config(allowedOrigins)).then((resp) => {
      expect(resp.statusCode).toBe(200);
      expect(resp.headers).toStrictEqual({
        'Access-Control-Allow-Origin': 'https://app.notifycal.com',
        'Access-Control-Allow-Headers': 'GET,POST,OPTIONS,PUT,DELETE,PATCH',
        'Access-Control-Allow-Methods':
          'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Content-Type': 'application/json',
        Vary: 'Origin'
      });
    });
  });

  function testIt(
    event: APIGatewayProxyEvent,
    getUserByIdFn: () => Promise<UserStoreRecord<IdpName> | undefined>,
    env: GetUserProfileConfig = config()
  ): Promise<APIGatewayProxyResult> {
    setEnv(env);
    vi.mock('@services/stores/user-base-store');
    const userBaseStoreMock = {
      getUserById: vi.fn().mockImplementation(getUserByIdFn)
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(UserBaseStore.withConfig).mockReturnValue(
      userBaseStoreMock as unknown as UserBaseStore<IdpName>
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return handler(event as unknown as Event, c);
  }
});

function config(allowedOrigins: Array<string> = ['http://localhost:5173']): GetUserProfileConfig {
  return {
    decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig(),
    userBaseStoreConfig: {
      tableName: 'Users-local'
    },
    corsConfig: {
      allowedOrigins: allowedOrigins
    }
  };
}

function setEnv(config: GetUserProfileConfig): void {
  setEnvDecodeAccessJwtConfig(config.decodeAccessJwtConfig);
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
  setEnvBaseConfig(config.corsConfig);
}
