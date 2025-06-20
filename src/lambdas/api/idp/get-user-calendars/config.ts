import type { AuthedEndpointConfig, IdpEndpointConfig } from '@model/Config';
import {
  readBaseConfig,
  readDecodeAccessJwtConfig,
  readEnv,
  readIdpConfigs,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';

export type GetUserCalendarsConfig = AuthedEndpointConfig &
  IdpEndpointConfig &
  UserBaseStoreEndpointConfig;

export function readGetUserCalendarListConfig(): Promise<GetUserCalendarsConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readIdpConfigs(env),
    ...readUserBaseStoreConfig(env),
    ...readDecodeAccessJwtConfig(env),
    ...readBaseConfig(env)
  }));
}
