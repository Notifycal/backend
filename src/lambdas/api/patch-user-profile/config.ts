import type { AuthedEndpointConfig } from '@model/Config';
import {
  readAuthedEndpointConfig,
  readEnv,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';

export type PatchUserProfileConfig = AuthedEndpointConfig & UserBaseStoreEndpointConfig;

export function readPatchUserConfig(): Promise<PatchUserProfileConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAuthedEndpointConfig(env),
    ...readUserBaseStoreConfig(env)
  }));
}
