import { from } from 'env-var';
import {
  AwsConfig,
  DecodeAccessJwtConfig,
  DecodeRefreshJwtConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import { Environment } from '@own-types/model';

export function readEnv() {
  return from(process.env, {});
}

export function readEncodeAccessJwtConfig(env: Environment): EncodeAccessJwtConfig {
  return {
    privateKey: env.get('ACCESS_JWT_PRIVATE_KEY').required().asString(),
    algorithm: env.get('ACCESS_JWT_ALGORITHM').required().default('RS256').asString(),
    issuer: env.get('ACCESS_JWT_ISSUER').required().default('notifycal.com').asString(),
    audience: env.get('ACCESS_JWT_AUDIENCE').required().default('notifycal.com').asString(),
    expiresIn: env.get('ACCESS_JWT_EXPIRATION').required().default('5m').asString()
  };
}

export function readEncodeRefreshJwtConfig(env: Environment): EncodeRefreshJwtConfig {
  return {
    privateKey: env.get('REFRESH_JWT_PRIVATE_KEY').required().asString(),
    algorithm: env.get('REFRESH_JWT_ALGORITHM').required().default('RS256').asString(),
    issuer: env.get('REFRESH_JWT_ISSUER').required().default('notifycal.com').asString(),
    audience: env.get('REFRESH_JWT_AUDIENCE').required().default('notifycal.com').asString(),
    expiresIn: env.get('REFRESH_JWT_EXPIRATION').required().default('7d').asString()
  };
}

export function readDecodeAccessJwtConfig(env: Environment): DecodeAccessJwtConfig {
  return {
    publicKey: env.get('ACCESS_JWT_PUBLIC_KEY').required().asString(),
    issuer: env.get('ACCESS_JWT_ISSUER').required().default('notifycal.com').asString(),
    audience: env.get('ACCESS_JWT_AUDIENCE').required().default('notifycal.com').asString(),
    expiresIn: env.get('ACCESS_JWT_EXPIRATION').required().default('5m').asString()
  };
}

export function readDecodeRefreshJwtConfig(env: Environment): DecodeRefreshJwtConfig {
  return {
    publicKey: env.get('REFRESH_JWT_PUBLIC_KEY').required().asString(),
    issuer: env.get('REFRESH_JWT_ISSUER').required().default('notifycal.com').asString(),
    audience: env.get('REFRESH_JWT_AUDIENCE').required().default('notifycal.com').asString(),
    expiresIn: env.get('REFRESH_JWT_EXPIRATION').required().default('7d').asString()
  };
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
