import type { AuthedEndpointConfig } from '@model/Config';
import { readAuthedEndpointConfig, readEnv, readUserBaseStoreConfig } from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';

export type PatchUserProfileConfig = AuthedEndpointConfig & UserBaseStoreEndpointConfig;

export function readPatchUserConfig(): PatchUserProfileConfig {
  const env = readEnv();
  return {
    ...readAuthedEndpointConfig(env),
    ...readUserBaseStoreConfig(env)
  };
}
