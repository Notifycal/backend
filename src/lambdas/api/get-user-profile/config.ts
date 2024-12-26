import { UserBaseStoreConfig } from '@services/user-base-store';
import { readAwsConfig, readDecodeAccessJwtConfig, readEnv } from '@services/common/config';
import { AwsConfig } from '@model/Config';
import { AuthedEndpointConfig } from '@model/Config';

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
    awsConfig: readAwsConfig(env)
  };
}
