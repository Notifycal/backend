import { ExtenderTypeOptional, from, IEnv, IOptionalVariable } from 'env-var';
import { AwsConfig } from '@model/AwsConfig';
import { UserBaseStoreConfig } from '@services/users-provider';

export interface LoginConfig {
  privateKey: string;
  jwt: JwtConfig;
  googleClientId: string;
  userProvider: UserBaseStoreConfig;
  awsConfig: AwsConfig;
}

export interface JwtConfig {
  algorithm: string;
  issuer: string;
  expiresIn: string;
}

export function readLoginConfig(): LoginConfig {
  const env = from(process.env, {});
  const awsCredentials = readAwsCredentials(env);
  return {
    privateKey: env.get('JWT_PRIVATE_KEY').required().asString(),
    jwt: {
      algorithm: env.get('JWT_ALGORITHM').required().default('RS256').asString(),
      issuer: env.get('JWT_ISSUER').required().default('notifycal.com').asString(),
      expiresIn: env.get('JWT_EXPIRATION').required().default('5m').asString()
    },
    googleClientId: env.get('GOOGLE_CLIENT_ID').required().asString(),
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
