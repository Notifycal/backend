import { from } from 'env-var';
import { AwsConfig } from '@model/Config';
import { Environment } from '@own-types/model';

export function readEnv() {
  return from(process.env, {});
}

export function readAwsConfig(env: Environment): AwsConfig {
  return {
    awsRegion: env.get('AWS_REGION').required().default('eu-west-1').asString(),
    endpoint: env.get('AWS_ENDPOINT_URL').asString(),
    credentials: readAwsCredentials(env)
  };
}

function readAwsCredentials(
  env: Environment
): { accessKeyId: string; secretAccessKey: string } | undefined {
  const accessKeyId = env.get('AWS_ACCESS_KEY_ID').asString();
  const secretAccessKey = env.get('AWS_SECRET_ACCESS_KEY').asString();
  return accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
}
