import type { UserBaseStoreConfig } from '@services/user-base-store';
import {
  readAwsConfig,
  readBaseConfig,
  readDecodeAccessJwtConfig,
  readEnv
} from '@services/common/config';
import type { AuthedEndpointConfig, AwsConfig } from '@model/Config';

export interface GetUserProfileConfig extends AuthedEndpointConfig {
  userBaseStore: UserBaseStoreConfig;
  awsConfig: AwsConfig;
}

export function readGetUserConfig(): GetUserProfileConfig {
  const env = readEnv();
  return {
    decodeAccessJwtConfig: readDecodeAccessJwtConfig(env),
    userBaseStore: {
      tableName: env.get('USERS_TABLE_NAME').required().asString()
    },
    baseConfig: readBaseConfig(env).baseConfig,
    awsConfig: readAwsConfig(env)
  };
}
