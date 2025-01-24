import {
  readBaseConfig,
  readDecodeAccessJwtConfig,
  readEnv,
  readIdpConfigs,
  readUserStoreConfig
} from '@services/common/config';
import type { AuthedEndpointConfig, IdpEndpointConfig } from '@model/Config';
import type { UserBaseStoreEndpointConfig } from '@services/user-base-store';

export type GetUserCalendarListConfig = AuthedEndpointConfig &
  IdpEndpointConfig &
  UserBaseStoreEndpointConfig;

export function readGetUserCalendarListConfig(): GetUserCalendarListConfig {
  const env = readEnv();
  return {
    ...readIdpConfigs(env),
    ...readUserStoreConfig(env),
    ...readDecodeAccessJwtConfig(env),
    ...readBaseConfig(env)
  };
}
