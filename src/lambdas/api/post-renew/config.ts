import {
  AwsConfig,
  DecodeRefreshJwtConfig,
  EncodeJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import { readAwsConfig, readEnv } from '@services/common/config';
import { RefreshTokenBaseStoreConfig } from '@services/refresh-token-base-store';

export interface RenewConfig {
  encodeJwtConfig: EncodeJwtConfig;
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig;
  decodeRefreshJwtConfig: DecodeRefreshJwtConfig;
  refreshTokenBaseStoreConfig: RefreshTokenBaseStoreConfig;
  awsConfig: AwsConfig;
}

export function readRenewConfig(): RenewConfig {
  const env = readEnv();
  return {
    encodeJwtConfig: {
      privateKey: env.get('JWT_PRIVATE_KEY').required().asString(),
      algorithm: env.get('JWT_ALGORITHM').required().default('RS256').asString(),
      issuer: env.get('JWT_ISSUER').required().default('notifycal.com').asString(),
      audience: env.get('JWT_AUDIENCE').required().default('notifycal.com').asString(),
      expiresIn: env.get('JWT_EXPIRATION').required().default('5m').asString()
    },
    encodeRefreshJwtConfig: {
      privateKey: env.get('REFRESH_JWT_PRIVATE_KEY').required().asString(),
      algorithm: env.get('REFRESH_JWT_ALGORITHM').required().default('RS256').asString(),
      issuer: env.get('REFRESH_JWT_ISSUER').required().default('notifycal.com').asString(),
      audience: env.get('REFRESH_JWT_AUDIENCE').required().default('notifycal.com').asString(),
      expiresIn: env.get('REFRESH_JWT_EXPIRATION').required().default('7d').asString()
    },
    decodeRefreshJwtConfig: {
      publicKey: env.get('REFRESH_JWT_PRIVATE_KEY').required().asString(),
      issuer: env.get('REFRESH_JWT_ISSUER').required().default('notifycal.com').asString(),
      audience: env.get('REFRESH_JWT_AUDIENCE').required().default('notifycal.com').asString(),
      expiresIn: env.get('REFRESH_JWT_EXPIRATION').required().default('7d').asString()
    },
    refreshTokenBaseStoreConfig: {
      tableName: env.get('REFRESH_TOKENS_TABLE_NAME').required().asString()
    },
    awsConfig: readAwsConfig(env)
  };
}
