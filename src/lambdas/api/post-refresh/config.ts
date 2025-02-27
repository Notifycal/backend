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
  readUserBaseStoreConfig
} from '@services/common/config';
import type { RefreshTokenBaseStoreConfig } from '@services/stores/refresh-token-base-store';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';
export interface BaseRefreshConfig {
  encodeAccessJwtConfig: EncodeAccessJwtConfig;
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig;
  decodeRefreshJwtConfig: DecodeRefreshJwtConfig;
  refreshTokenBaseStoreConfig: RefreshTokenBaseStoreConfig;
}
export type RefreshConfig = BaseRefreshConfig & BaseEndpointConfig & UserBaseStoreEndpointConfig;

export function readRefreshConfig(): Promise<RefreshConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readEncodeJwtsConfig(env),
    decodeRefreshJwtConfig: readDecodeRefreshJwtConfig(env),
    ...readRefreshTokenStoreConfig(env),
    ...readUserBaseStoreConfig(env),
    ...readBaseConfig(env)
  }));
}
