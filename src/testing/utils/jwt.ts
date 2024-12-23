import { buildJwt } from '@services/jwt';
import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { EncodeJwtConfig } from '@lambdas/api/login/config';

const loadDevConfig = (() => {
  let devConfig: Record<string, string> | undefined;

  return () => {
    if (!devConfig) {
      console.log('Cargando configuración dev...');
      devConfig = dotenv.parse(
        fs.readFileSync(path.resolve(__dirname, '../../resources/config/.env.dev'), 'utf8')
      );
    }
    return devConfig;
  };
})();

// Valores perezosos encapsulados en funciones
export const getDefaultPayload = () => ({
  email: 'test@notifycal.com'
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
    maxAge: devConfig.JWT_EXPIRATION
  };
};

export function testJwt(
  payload: object = getDefaultPayload(),
  config: EncodeJwtConfig = getDefaultEncodeJwtConfig()
): Promise<string> {
  return buildJwt(payload, 'SomeSubjectIdentifyingTheUser', config);
}
