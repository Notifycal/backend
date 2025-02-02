import type { AuthedEndpointConfig, IdpEndpointConfig } from '@model/Config';
import {
  readBaseConfig,
  readDecodeAccessJwtConfig,
  readEnv,
  readIdpConfigs,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';

export type GetUserCalendarsConfig = AuthedEndpointConfig &
  IdpEndpointConfig &
  UserBaseStoreEndpointConfig;

export function readGetUserCalendarListConfig(): GetUserCalendarsConfig {
  const env = readEnv();
  return {
    ...readIdpConfigs(env),
    ...readUserBaseStoreConfig(env),
    ...readDecodeAccessJwtConfig(env),
    ...readBaseConfig(env)
  };
}
