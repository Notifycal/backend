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
  readUserBaseStoreConfig
} from '@services/common/config';
import type { RefreshTokenBaseStoreConfig } from '@services/stores/refresh-token-base-store';
import type { UserBaseStoreConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';

interface BaseLoginConfig {
  encodeAccessJwtConfig: EncodeAccessJwtConfig;
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig;
  userBaseStoreConfig: UserBaseStoreConfig;
  refreshTokenBaseStoreConfig: RefreshTokenBaseStoreConfig;
}

export type LoginConfig = BaseLoginConfig & BaseEndpointConfig & IdpEndpointConfig;

export function readLoginConfig(): Promise<LoginConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readEncodeJwtsConfig(env),
    ...readIdpConfigs(env),
    ...readUserBaseStoreConfig(env),
    ...readRefreshTokenStoreConfig(env),
    ...readBaseConfig(env)
  }));
}
