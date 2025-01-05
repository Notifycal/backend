import type {
  BaseEndpointConfig,
  DecodeRefreshJwtConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import {
  readBaseConfig,
  readDecodeRefreshJwtConfig,
  readEncodeAccessJwtConfig,
  readEncodeRefreshJwtConfig,
  readEnv
} from '@services/common/config';
import type { RefreshTokenBaseStoreConfig } from '@services/refresh-token-base-store';

export interface RefreshConfig extends BaseEndpointConfig {
  encodeAccessJwtConfig: EncodeAccessJwtConfig;
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig;
  decodeRefreshJwtConfig: DecodeRefreshJwtConfig;
  refreshTokenBaseStoreConfig: RefreshTokenBaseStoreConfig;
}

export function readRefreshConfig(): RefreshConfig {
  const env = readEnv();
  return {
    encodeAccessJwtConfig: readEncodeAccessJwtConfig(env),
    encodeRefreshJwtConfig: readEncodeRefreshJwtConfig(env),
    decodeRefreshJwtConfig: readDecodeRefreshJwtConfig(env),
    refreshTokenBaseStoreConfig: {
      tableName: env.get('REFRESH_TOKENS_TABLE_NAME').required().asString()
    },
    baseConfig: readBaseConfig(env).baseConfig
  };
}
