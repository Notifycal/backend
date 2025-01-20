import type {
  BaseEndpointConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import type { GoogleOAuthConfig } from '@services/google/google-oauth';
import type { UserBaseStoreConfig } from '@services/user-base-store';
import {
  readBaseConfig,
  readEncodeAccessJwtConfig,
  readEncodeRefreshJwtConfig,
  readEnv,
  readUserStoreConfig
} from '@services/common/config';
import type { RefreshTokenBaseStoreConfig } from '@services/refresh-token-base-store';

export interface LoginConfig extends BaseEndpointConfig {
  encodeAccessJwtConfig: EncodeAccessJwtConfig;
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig;
  googleOAuthClientConfig: GoogleOAuthConfig;
  userBaseStoreConfig: UserBaseStoreConfig;
  refreshTokenBaseStoreConfig: RefreshTokenBaseStoreConfig;
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
    userBaseStoreConfig: readUserStoreConfig(env),
    refreshTokenBaseStoreConfig: {
      tableName: env.get('REFRESH_TOKENS_TABLE_NAME').required().asString()
    },
    baseConfig: readBaseConfig(env).baseConfig
  };
}
