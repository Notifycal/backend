import {
  DecodeAccessJwtConfig,
  DecodeRefreshJwtConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import { AwsConfig } from '@model/Config';
import { RefreshTokenBaseStoreConfig } from '@services/refresh-token-base-store';
import { UserBaseStoreConfig } from '@services/user-base-store';

export function setEnvEncodeAccessJwtConfig(config: EncodeAccessJwtConfig) {
  process.env.ACCESS_JWT_PRIVATE_KEY = config.privateKey;
  process.env.ACCESS_JWT_ALGORITHM = config.algorithm;
  process.env.ACCESS_JWT_ISSUER = config.issuer;
  process.env.ACCESS_JWT_AUDIENCE = config.audience;
  process.env.ACCESS_JWT_EXPIRATION = config.expiresIn;
}

export function setEnvEncodeRefreshJwtConfig(config: EncodeRefreshJwtConfig) {
  process.env.REFRESH_JWT_PRIVATE_KEY = config.privateKey;
  process.env.REFRESH_JWT_ALGORITHM = config.algorithm;
  process.env.REFRESH_JWT_ISSUER = config.issuer;
  process.env.REFRESH_JWT_AUDIENCE = config.audience;
  process.env.REFRESH_JWT_EXPIRATION = config.expiresIn;
}

export function setEnvDecodeAccessJwtConfig(config: DecodeAccessJwtConfig) {
  process.env.ACCESS_JWT_PUBLIC_KEY = config.publicKey;
  process.env.ACCESS_JWT_AUDIENCE = config.audience;
  process.env.ACCESS_JWT_ISSUER = config.issuer;
  process.env.ACCESS_JWT_EXPIRATION = config.expiresIn;
}

export function setEnvDecodeRefreshJwtConfig(config: DecodeRefreshJwtConfig) {
  process.env.REFRESH_JWT_PUBLIC_KEY = config.publicKey;
  process.env.REFRESH_JWT_AUDIENCE = config.audience;
  process.env.REFRESH_JWT_ISSUER = config.issuer;
  process.env.REFRESH_JWT_EXPIRATION = config.expiresIn;
}

export function setEnvUserBaseStoreConfig(config: UserBaseStoreConfig) {
  process.env.USERS_TABLE_NAME = config.tableName;
}

export function setEnvRefreshTokenBaseStoreConfig(config: RefreshTokenBaseStoreConfig) {
  process.env.REFRESH_TOKENS_TABLE_NAME = config.tableName;
}

export function setEnvAwsConfig(config: AwsConfig) {
  process.env.AWS_REGION = config.awsRegion;
  process.env.AWS_ENDPOINT_URL = config.endpoint;
  process.env.AWS_ACCESS_KEY_ID = config.credentials?.accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = config.credentials?.secretAccessKey;
}
