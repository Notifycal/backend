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
  readEnv,
  readRefreshTokenStoreConfig,
  readUserStoreConfig
} from '@services/common/config';
import type { RefreshTokenBaseStoreConfig } from '@services/refresh-token-base-store';
import type { UserBaseStoreConfig } from '@services/user-base-store';

export interface RefreshConfig extends BaseEndpointConfig {
  encodeAccessJwtConfig: EncodeAccessJwtConfig;
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig;
  decodeRefreshJwtConfig: DecodeRefreshJwtConfig;
  refreshTokenBaseStoreConfig: RefreshTokenBaseStoreConfig;
  userBaseStoreConfig: UserBaseStoreConfig;
}

export function readRefreshConfig(): RefreshConfig {
  const env = readEnv();
  return {
    encodeAccessJwtConfig: readEncodeAccessJwtConfig(env),
    encodeRefreshJwtConfig: readEncodeRefreshJwtConfig(env),
    decodeRefreshJwtConfig: readDecodeRefreshJwtConfig(env),
    refreshTokenBaseStoreConfig: readRefreshTokenStoreConfig(env),
    userBaseStoreConfig: readUserStoreConfig(env),
    baseConfig: readBaseConfig(env).baseConfig
  };
}
