import type {
  BaseEndpointConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig,
  IdpEndpointConfig
} from '@model/Config';
import {
  readBaseConfig,
  readEncodeJwtsConfig,
  readEnv,
  readIdpConfigs,
  readRefreshTokenStoreConfig,
  readUserStoreConfig
} from '@services/common/config';
import type { RefreshTokenBaseStoreConfig } from '@services/stores/refresh-token-base-store';
import type { UserBaseStoreConfig } from '@services/stores/user-base-store';

interface BaseLoginConfig {
  encodeAccessJwtConfig: EncodeAccessJwtConfig;
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig;
  userBaseStoreConfig: UserBaseStoreConfig;
  refreshTokenBaseStoreConfig: RefreshTokenBaseStoreConfig;
}

export type LoginConfig = BaseLoginConfig & BaseEndpointConfig & IdpEndpointConfig;

export function readLoginConfig(): LoginConfig {
  const env = readEnv();
  return {
    ...readEncodeJwtsConfig(env),
    ...readIdpConfigs(env),
    ...readUserStoreConfig(env),
    ...readRefreshTokenStoreConfig(env),
    ...readBaseConfig(env)
  };
}
