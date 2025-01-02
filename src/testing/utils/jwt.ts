import type { DecodeAccessJwtConfig } from './../../model/Config';
import { buildJwt } from '@services/jwt';
import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import type { EncodeAccessJwtConfig } from '@model/Config';
import { type OurAccessTokenClaims, accessTokenSchema } from '@model/Jwt';
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

export const getDefaultAccessTokenPayload: () => OurAccessTokenClaims = () => ({
  email: 'test@notifycal.com',
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
  return buildJwt(payload, jwtSchema, 'SomeSubjectIdentifyingTheUser', config).then(
    (jwts) => jwts.encoded
  );
}
