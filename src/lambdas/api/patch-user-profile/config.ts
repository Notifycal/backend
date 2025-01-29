import type { AuthedEndpointConfig } from '@model/Config';
import { readAuthedEndpointConfig, readEnv, readUserStoreConfig } from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/user-base-store';

export type PatchUserProfileConfig = AuthedEndpointConfig & UserBaseStoreEndpointConfig;

export function readPatchUserConfig(): PatchUserProfileConfig {
  const env = readEnv();
  return {
    ...readAuthedEndpointConfig(env),
    ...readUserStoreConfig(env)
  };
}
