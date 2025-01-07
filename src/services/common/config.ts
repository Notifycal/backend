import { from } from 'env-var';

import type {
  BaseEndpointConfig,
  DecodeAccessJwtConfig,
  DecodeRefreshJwtConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import type { Environment } from '@own-types/model';

export function readEnv(): Environment {
  return from(process.env, {});
}

const readJwtConfig = (
  env: Environment,
  prefix: 'ACCESS' | 'REFRESH',
  expiresInDefault: string
): Omit<EncodeAccessJwtConfig, 'privateKey'> => ({
  algorithm: env.get(`${prefix}_JWT_ALGORITHM`).required().default('RS256').asString(),
  issuer: env.get(`${prefix}_JWT_ISSUER`).required().default('notifycal.com').asString(),
  audience: env.get(`${prefix}_JWT_AUDIENCE`).required().default('notifycal.com').asString(),
  expiresIn: env.get(`${prefix}_JWT_EXPIRATION`).required().default(expiresInDefault).asString()
});

export function readBaseConfig(env: Environment): BaseEndpointConfig {
  return {
    baseConfig: {
      frontendDomain: env.get(`FRONTEND_DOMAIN`).required().asString()
    }
  };
}

export function readEncodeAccessJwtConfig(env: Environment): EncodeAccessJwtConfig {
  return {
    privateKey: env.get(`ACCESS_JWT_PRIVATE_KEY`).required().asString(),
    ...readJwtConfig(env, 'ACCESS', '5m')
  };
}

export function readEncodeRefreshJwtConfig(env: Environment): EncodeRefreshJwtConfig {
  return {
    privateKey: env.get(`REFRESH_JWT_PRIVATE_KEY`).required().asString(),
    ...readJwtConfig(env, 'REFRESH', '7d')
  };
}

export function readDecodeAccessJwtConfig(env: Environment): DecodeAccessJwtConfig {
  return {
    publicKey: env.get('ACCESS_JWT_PUBLIC_KEY').required().asString(),
    ...readJwtConfig(env, 'ACCESS', '5m')
  };
}

export function readDecodeRefreshJwtConfig(env: Environment): DecodeRefreshJwtConfig {
  return {
    publicKey: env.get('REFRESH_JWT_PUBLIC_KEY').required().asString(),
    ...readJwtConfig(env, 'REFRESH', '7d')
  };
}
