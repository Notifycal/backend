import { readAuthedEndpointConfig, readEnv, readUserStoreConfig } from '@services/common/config';
import type { AuthedEndpointConfig } from '@model/Config';
import type { UserBaseStoreEndpointConfig } from '@services/user-base-store';

export type GetUserProfileConfig = AuthedEndpointConfig & UserBaseStoreEndpointConfig;

export function readGetUserConfig(): GetUserProfileConfig {
  const env = readEnv();
  return {
    ...readAuthedEndpointConfig(env),
    ...readUserStoreConfig(env)
  };
}
