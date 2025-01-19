import {
  readBaseConfig,
  readDecodeAccessJwtConfig,
  readEnv,
  readUserStoreConfig
} from '@services/common/config';
import type { AuthedEndpointConfig } from '@model/Config';
import type { UserBaseStoreConfig } from '@services/user-base-store';

export interface GetUserProfileConfig extends AuthedEndpointConfig {
  userBaseStore: UserBaseStoreConfig;
}

export function readGetUserConfig(): GetUserProfileConfig {
  const env = readEnv();
  return {
    decodeAccessJwtConfig: readDecodeAccessJwtConfig(env),
    userBaseStore: readUserStoreConfig(env),
    baseConfig: readBaseConfig(env).baseConfig
  };
}
