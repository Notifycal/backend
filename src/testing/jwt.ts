import { buildJwt } from '@services/jwt';
import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { EncodeJwtConfig } from '@lambdas/api/login/config';

const devConfig = dotenv.parse(
  fs.readFileSync(path.resolve(__dirname, '../resources/config/.env.dev'), 'utf8')
);

export const { defaultPayload, defaultEncodeJwtConfig, defaultDecodeJwtConfig } = {
  defaultPayload: {
    email: 'test@notifycal.com'
  },
  defaultEncodeJwtConfig: {
    privateKey: devConfig.JWT_PRIVATE_KEY,
    algorithm: devConfig.JWT_ALGORITHM,
    issuer: devConfig.JWT_ISSUER,
    audience: devConfig.JWT_AUDIENCE,
    expiresIn: devConfig.JWT_EXPIRATION
  },
  defaultDecodeJwtConfig: {
    publicKey: devConfig.JWT_PUBLIC_KEY,
    issuer: devConfig.JWT_ISSUER,
    audience: devConfig.JWT_AUDIENCE,
    maxAge: devConfig.JWT_EXPIRATION
  }
};

export function testJwt(
  payload: object = defaultPayload,
  config: EncodeJwtConfig = defaultEncodeJwtConfig
): Promise<string> {
  return buildJwt(payload, 'SomeSubjectIdentifyingTheUser', config);
}
