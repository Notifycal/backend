import { AwsConfig } from '@model/AwsConfig';
import { UserBaseStoreConfig } from '@services/user-base-store';
import { readAwsConfig, readEnv } from '@services/utils/config';

export interface LoginConfig {
  encodeJwtConfig: EncodeJwtConfig;
  googleOAuthClient: GoogleOAuthConfig;
  userBaseStore: UserBaseStoreConfig;
  awsConfig: AwsConfig;
}

export interface EncodeJwtConfig {
  privateKey: string;
  algorithm: string;
  issuer: string;
  audience: string;
  expiresIn: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function readLoginConfig(): LoginConfig {
  const env = readEnv();
  return {
    encodeJwtConfig: {
      privateKey: env.get('JWT_PRIVATE_KEY').required().asString(),
      algorithm: env.get('JWT_ALGORITHM').required().default('RS256').asString(),
      issuer: env.get('JWT_ISSUER').required().default('notifycal.com').asString(),
      audience: env.get('JWT_AUDIENCE').required().default('notifycal.com').asString(),
      expiresIn: env.get('JWT_EXPIRATION').required().default('5m').asString()
    },
    googleOAuthClient: {
      clientId: env.get('GOOGLE_OAUTH_CLIENT_ID').required().asString(),
      clientSecret: env.get('GOOGLE_OAUTH_CLIENT_SECRET').required().asString(),
      redirectUri: env.get('GOOGLE_OAUTH_CLIENT_REDIRECT_URI').required().asString()
    },
    userBaseStore: {
      tableName: env.get('USERS_TABLE_NAME').required().asString()
    },
    awsConfig: readAwsConfig(env)
  };
}
