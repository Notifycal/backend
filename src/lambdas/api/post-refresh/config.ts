import type {
  BaseEndpointConfig,
  DecodeRefreshJwtConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import {
  readBaseConfig,
  readDecodeRefreshJwtConfig,
  readEncodeJwtsConfig,
  readEnv,
  readRefreshTokenStoreConfig,
  readUserStoreConfig
} from '@services/common/config';
import type { RefreshTokenBaseStoreConfig } from '@services/stores/refresh-token-base-store';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
export interface BaseRefreshConfig {
  encodeAccessJwtConfig: EncodeAccessJwtConfig;
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig;
  decodeRefreshJwtConfig: DecodeRefreshJwtConfig;
  refreshTokenBaseStoreConfig: RefreshTokenBaseStoreConfig;
}
export type RefreshConfig = BaseRefreshConfig & BaseEndpointConfig & UserBaseStoreEndpointConfig;

export function readRefreshConfig(): RefreshConfig {
  const env = readEnv();
  return {
    ...readEncodeJwtsConfig(env),
    decodeRefreshJwtConfig: readDecodeRefreshJwtConfig(env),
    ...readRefreshTokenStoreConfig(env),
    ...readUserStoreConfig(env),
    ...readBaseConfig(env)
  };
}
