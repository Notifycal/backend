import type {
  AuthedEndpointConfig,
  BaseEndpointConfig,
  DecodeAccessJwtConfig,
  DecodeAccessJwtEndpointConfig,
  DecodeRefreshJwtConfig,
  EncodeAccessJwtConfig,
  EncodeJwtsEndpointConfig,
  EncodeRefreshJwtConfig,
  IdpEndpointConfig
} from '@model/Config';
import type { Environment } from '@own-types/model';
import type { RefreshTokenBaseStoreConfigEndpointConfig } from '@services/refresh-token-base-store';
import type { UserBaseStoreEndpointConfig } from '@services/user-base-store';
import { from } from 'env-var';

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

function readEncodeAccessJwtConfig(env: Environment): EncodeAccessJwtConfig {
  return {
    privateKey: env.get(`ACCESS_JWT_PRIVATE_KEY`).required().asString(),
    ...readJwtConfig(env, 'ACCESS', '5m')
  };
}

function readEncodeRefreshJwtConfig(env: Environment): EncodeRefreshJwtConfig {
  return {
    privateKey: env.get(`REFRESH_JWT_PRIVATE_KEY`).required().asString(),
    ...readJwtConfig(env, 'REFRESH', '7d')
  };
}

export function readEncodeJwtsConfig(env: Environment): EncodeJwtsEndpointConfig {
  return {
    encodeAccessJwtConfig: readEncodeAccessJwtConfig(env),
    encodeRefreshJwtConfig: readEncodeRefreshJwtConfig(env)
  };
}

function _readDecodeAccessJwtConfig(env: Environment): DecodeAccessJwtConfig {
  return {
    publicKey: env.get('ACCESS_JWT_PUBLIC_KEY').required().asString(),
    ...readJwtConfig(env, 'ACCESS', '5m')
  };
}

export function readDecodeAccessJwtConfig(env: Environment): DecodeAccessJwtEndpointConfig {
  return {
    decodeAccessJwtConfig: _readDecodeAccessJwtConfig(env)
  };
}

export function readAuthedEndpointConfig(env: Environment): AuthedEndpointConfig {
  return {
    ...readDecodeAccessJwtConfig(env),
    ...readBaseConfig(env)
  };
}

export function readDecodeRefreshJwtConfig(env: Environment): DecodeRefreshJwtConfig {
  return {
    publicKey: env.get('REFRESH_JWT_PUBLIC_KEY').required().asString(),
    ...readJwtConfig(env, 'REFRESH', '7d')
  };
}

export function readUserStoreConfig(env: Environment): UserBaseStoreEndpointConfig {
  return {
    userBaseStoreConfig: {
      tableName: env.get('USERS_TABLE_NAME').required().asString()
    }
  };
}

export function readRefreshTokenStoreConfig(
  env: Environment
): RefreshTokenBaseStoreConfigEndpointConfig {
  return {
    refreshTokenBaseStoreConfig: {
      tableName: env.get('REFRESH_TOKENS_TABLE_NAME').required().asString()
    }
  };
}

export function readIdpConfigs(env: Environment): IdpEndpointConfig {
  return {
    idpConfigs: {
      'google.com': {
        clientId: env.get('GOOGLE_OAUTH_CLIENT_ID').required().asString(),
        clientSecret: env.get('GOOGLE_OAUTH_CLIENT_SECRET').required().asString(),
        redirectUri: env.get('GOOGLE_OAUTH_CLIENT_REDIRECT_URI').required().asString()
      }
    }
  };
}
