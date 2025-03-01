import type { AuthedEndpointConfig } from '@model/Config';
import {
  readAuthedEndpointConfig,
  readEnv,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';

export type GetUserProfileConfig = AuthedEndpointConfig & UserBaseStoreEndpointConfig;

export function readGetUserConfig(): Promise<GetUserProfileConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAuthedEndpointConfig(env),
    ...readUserBaseStoreConfig(env)
  }));
}
