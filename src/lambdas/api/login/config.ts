import { ExtenderTypeOptional, from, IEnv, IOptionalVariable } from 'env-var';
import { AwsConfig } from '@model/AwsConfig';
import { UserBaseStoreConfig } from '@services/user-base-store';

export interface LoginConfig {
  jwt: EncodeJwtConfig;
  googleOAuthClient: GoogleOAuthConfig;
  userProvider: UserBaseStoreConfig;
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
  const env = from(process.env, {});
  const awsCredentials = readAwsCredentials(env);
  return {
    jwt: {
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
    userProvider: {
      tableName: env.get('USERS_TABLE_NAME').required().asString()
    },
    awsConfig: {
      awsRegion: env.get('AWS_REGION').required().default('eu-west-1').asString(),
      endpoint: env.get('AWS_ENDPOINT_URL').asString(),
      credentials: awsCredentials
    }
  };
}

function readAwsCredentials(
  /* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
  env: IEnv<IOptionalVariable<{}> & ExtenderTypeOptional<{}>, NodeJS.ProcessEnv>
): { accessKeyId: string; secretAccessKey: string } | undefined {
  const accessKeyId = env.get('AWS_ACCESS_KEY_ID').asString();
  const secretAccessKey = env.get('AWS_SECRET_ACCESS_KEY').asString();
  return accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
}
