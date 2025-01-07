import type { UserBaseStoreConfig } from '@services/user-base-store';
import { readBaseConfig, readDecodeAccessJwtConfig, readEnv } from '@services/common/config';
import type { AuthedEndpointConfig } from '@model/Config';

export interface GetUserProfileConfig extends AuthedEndpointConfig {
  userBaseStore: UserBaseStoreConfig;
}

export function readGetUserConfig(): GetUserProfileConfig {
  const env = readEnv();
  return {
    decodeAccessJwtConfig: readDecodeAccessJwtConfig(env),
    userBaseStore: {
      tableName: env.get('USERS_TABLE_NAME').required().asString()
    },
    baseConfig: readBaseConfig(env).baseConfig
  };
}
