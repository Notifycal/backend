import { buildJwt } from '@services/jwt';
import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { EncodeJwtConfig } from '@lambdas/api/post-login/config';

// Lazy evaluation all over the place so express doesn't attempt to load what it mustn't
const loadDevConfig = (() => {
  let devConfig: Record<string, string> | undefined;

  return () => {
    if (!devConfig) {
      devConfig = dotenv.parse(
        fs.readFileSync(path.resolve(__dirname, '../../resources/config/.env.dev'), 'utf8')
      );
    }
    return devConfig;
  };
})();

export const getDefaultPayload = () => ({
  email: 'test@notifycal.com',
  role: 'user'
});

export const getDefaultEncodeJwtConfig = () => {
  const devConfig = loadDevConfig();
  return {
    privateKey: devConfig.JWT_PRIVATE_KEY,
    algorithm: devConfig.JWT_ALGORITHM,
    issuer: devConfig.JWT_ISSUER,
    audience: devConfig.JWT_AUDIENCE,
    expiresIn: devConfig.JWT_EXPIRATION
  };
};

export const getDefaultDecodeJwtConfig = () => {
  const devConfig = loadDevConfig();
  return {
    publicKey: devConfig.JWT_PUBLIC_KEY,
    issuer: devConfig.JWT_ISSUER,
    audience: devConfig.JWT_AUDIENCE,
    expiresIn: devConfig.JWT_EXPIRATION
  };
};

export function testJwt(
  payload: object = getDefaultPayload(),
  config: EncodeJwtConfig = getDefaultEncodeJwtConfig()
): Promise<string> {
  return buildJwt(payload, 'SomeSubjectIdentifyingTheUser', config);
}
