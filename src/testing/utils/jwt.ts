import type { DecodeAccessJwtConfig, EncodeAccessJwtConfig } from '@model/Config';
import { accessTokenSchema, type OurAccessTokenClaims } from '@model/Jwt';
import type { Email, Identity, IdpId, Jwt, UnixTimestamp, Uuid } from '@notifycal/shared/types';
import { buildJwt, type EncodedAndDecodedJwts } from '@services/jwt';
import dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';
import type { ZodSchema } from 'zod';
// Lazy evaluation all over the place so express doesn't attempt to load what it mustn't
const loadDevConfig: () => Record<string, string> = (() => {
  let devConfig: Record<string, string>;

  return () => {
    if (!devConfig) {
      devConfig = dotenv.parse(
        fs.readFileSync(path.resolve(__dirname, '../../resources/config/.env.dev'), 'utf8')
      );
    }
    return devConfig;
  };
})();

const userId = '09b6b481-3fa1-4ed4-b3c1-5a9467acc7ef' as Uuid;
const email = 'test@notifycal.com' as Email;
const identity: Identity<'google.com'> = {
  userId: userId,
  email: email,
  idp: 'google.com',
  idpId: '46345747457457' as IdpId
};
export const getDefaultAccessTokenPayload: () => OurAccessTokenClaims = () => ({
  ...identity,
  role: 'user',
  permissions: {}
});

export const getDefaultEncodeAccessJwtConfig: () => EncodeAccessJwtConfig = () => {
  const devConfig = loadDevConfig();
  return {
    privateKey: devConfig.ACCESS_JWT_PRIVATE_KEY,
    algorithm: devConfig.ACCESS_JWT_ALGORITHM,
    issuer: devConfig.ACCESS_JWT_ISSUER,
    audience: devConfig.ACCESS_JWT_AUDIENCE,
    expiresIn: devConfig.ACCESS_JWT_EXPIRATION
  };
};

export const getDefaultDecodeAccessJwtConfig: () => DecodeAccessJwtConfig = () => {
  const devConfig = loadDevConfig();
  return {
    publicKey: devConfig.ACCESS_JWT_PUBLIC_KEY,
    issuer: devConfig.ACCESS_JWT_ISSUER,
    audience: devConfig.ACCESS_JWT_AUDIENCE,
    expiresIn: devConfig.ACCESS_JWT_EXPIRATION
  };
};

export function testJwt(
  payload: object = getDefaultAccessTokenPayload(),
  jwtSchema: ZodSchema = accessTokenSchema,
  config: EncodeAccessJwtConfig = getDefaultEncodeAccessJwtConfig()
): Promise<string> {
  return buildJwt(payload, jwtSchema, userId, config).then((jwts) => jwts.encoded);
}

const validRefreshToken = 'some_valid_refresh_token' as Jwt;
export const validJwts: EncodedAndDecodedJwts = {
  accessToken: {
    encoded: 'some_valid_access_token' as Jwt,
    decoded: {
      header: {
        alg: 'ES256',
        typ: 'JWT'
      },
      payload: {
        ...identity,
        role: 'user',
        permissions: {},
        iat: 1735311407 as UnixTimestamp,
        exp: 1735512345 as UnixTimestamp,
        aud: 'local.notifycal.com',
        iss: 'local.notifycal.com',
        sub: identity.userId,
        jti: '9999999-d54b-4f70-90e1-59c02d0e7a02' as Uuid
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
        iat: 1735311407 as UnixTimestamp,
        exp: 1735599999 as UnixTimestamp,
        aud: 'local.notifycal.com',
        iss: 'local.notifycal.com',
        sub: identity.userId,
        jti: '8888888-d54b-4f70-90e1-59c02d0e7a02' as Uuid
      },
      signature: 'some_signature'
    }
  }
};
