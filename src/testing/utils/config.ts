import { DecodeJwtConfig } from '@model/AuthedEndpointConfig';
import { AwsConfig } from '@model/AwsConfig';
import { UserBaseStoreConfig } from '@services/user-base-store';

export function setEnvDecodeJwtConfig(config: DecodeJwtConfig) {
  process.env.JWT_PUBLIC_KEY = config.publicKey;
  process.env.JWT_AUDIENCE = config.audience;
  process.env.JWT_ISSUER = config.issuer;
  process.env.JWT_EXPIRATION = config.expiresIn;
}

export function setEnvUserBaseStoreConfig(config: UserBaseStoreConfig) {
  process.env.USERS_TABLE_NAME = config.tableName;
}

export function setEnvAwsConfig(config: AwsConfig) {
  process.env.AWS_REGION = config.awsRegion;
  process.env.AWS_ENDPOINT_URL = config.endpoint;
  process.env.AWS_ACCESS_KEY_ID = config.credentials?.accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = config.credentials?.secretAccessKey;
}
