import type { AwsConfig, EncodeAccessJwtConfig, EncodeRefreshJwtConfig } from '@model/Config';
import type { GoogleOAuthConfig } from '@services/google-oauth';
import type { UserBaseStoreConfig } from '@services/user-base-store';
import {
  readAwsConfig,
  readEncodeAccessJwtConfig,
  readEncodeRefreshJwtConfig,
  readEnv
} from '@services/common/config';
import type { RefreshTokenBaseStoreConfig } from '@services/refresh-token-base-store';

export interface LoginConfig {
  encodeAccessJwtConfig: EncodeAccessJwtConfig;
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig;
  googleOAuthClientConfig: GoogleOAuthConfig;
  userBaseStoreConfig: UserBaseStoreConfig;
  refreshTokenBaseStoreConfig: RefreshTokenBaseStoreConfig;
  awsConfig: AwsConfig;
}

export function readLoginConfig(): LoginConfig {
  const env = readEnv();
  return {
    encodeAccessJwtConfig: readEncodeAccessJwtConfig(env),
    encodeRefreshJwtConfig: readEncodeRefreshJwtConfig(env),
    googleOAuthClientConfig: {
      clientId: env.get('GOOGLE_OAUTH_CLIENT_ID').required().asString(),
      clientSecret: env.get('GOOGLE_OAUTH_CLIENT_SECRET').required().asString(),
      redirectUri: env.get('GOOGLE_OAUTH_CLIENT_REDIRECT_URI').required().asString()
    },
    userBaseStoreConfig: {
      tableName: env.get('USERS_TABLE_NAME').required().asString()
    },
    refreshTokenBaseStoreConfig: {
      tableName: env.get('REFRESH_TOKENS_TABLE_NAME').required().asString()
    },
    awsConfig: readAwsConfig(env)
  };
}
