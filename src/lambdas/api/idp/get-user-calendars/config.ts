import type { AuthedEndpointConfig, IdpEndpointConfig } from '@model/Config';
import {
  readBaseConfig,
  readDecodeAccessJwtConfig,
  readEnv,
  readIdpConfigs,
  readUserStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/user-base-store';

export type GetUserCalendarsConfig = AuthedEndpointConfig &
  IdpEndpointConfig &
  UserBaseStoreEndpointConfig;

export function readGetUserCalendarListConfig(): GetUserCalendarsConfig {
  const env = readEnv();
  return {
    ...readIdpConfigs(env),
    ...readUserStoreConfig(env),
    ...readDecodeAccessJwtConfig(env),
    ...readBaseConfig(env)
  };
}
