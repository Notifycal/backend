import { UserBaseStoreConfig } from '@services/user-base-store';
import { readAwsConfig, readEnv } from '@services/utils/config';
import { AwsConfig } from '@model/Config';
import { AuthedEndpointConfig } from '@model/Config';

export interface GetUserConfig extends AuthedEndpointConfig {
  userBaseStore: UserBaseStoreConfig;
  awsConfig: AwsConfig;
}

export function readGetUserConfig(): GetUserConfig {
  const env = readEnv();
  return {
    decodeJwtConfig: {
      publicKey: env.get('JWT_PUBLIC_KEY').required().asString(),
      issuer: env.get('JWT_ISSUER').required().default('notifycal.com').asString(),
      audience: env.get('JWT_AUDIENCE').required().default('notifycal.com').asString(),
      expiresIn: env.get('JWT_EXPIRATION').required().default('5m').asString()
    },
    userBaseStore: {
      tableName: env.get('USERS_TABLE_NAME').required().asString()
    },
    awsConfig: readAwsConfig(env)
  };
}
