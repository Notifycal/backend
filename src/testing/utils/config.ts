import type {
  DecodeAccessJwtConfig,
  DecodeRefreshJwtConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig,
  BaseConfig
} from '@model/Config';
import type { RefreshTokenBaseStoreConfig } from '@services/refresh-token-base-store';
import type { UserBaseStoreConfig } from '@services/user-base-store';

export function setEnvEncodeAccessJwtConfig(config: EncodeAccessJwtConfig): void {
  process.env.ACCESS_JWT_PRIVATE_KEY = config.privateKey;
  process.env.ACCESS_JWT_ALGORITHM = config.algorithm;
  process.env.ACCESS_JWT_ISSUER = config.issuer;
  process.env.ACCESS_JWT_AUDIENCE = config.audience;
  process.env.ACCESS_JWT_EXPIRATION = config.expiresIn;
}

export function setEnvEncodeRefreshJwtConfig(config: EncodeRefreshJwtConfig): void {
  process.env.REFRESH_JWT_PRIVATE_KEY = config.privateKey;
  process.env.REFRESH_JWT_ALGORITHM = config.algorithm;
  process.env.REFRESH_JWT_ISSUER = config.issuer;
  process.env.REFRESH_JWT_AUDIENCE = config.audience;
  process.env.REFRESH_JWT_EXPIRATION = config.expiresIn;
}

export function setEnvDecodeAccessJwtConfig(config: DecodeAccessJwtConfig): void {
  process.env.ACCESS_JWT_PUBLIC_KEY = config.publicKey;
  process.env.ACCESS_JWT_AUDIENCE = config.audience;
  process.env.ACCESS_JWT_ISSUER = config.issuer;
  process.env.ACCESS_JWT_EXPIRATION = config.expiresIn;
}

export function setEnvDecodeRefreshJwtConfig(config: DecodeRefreshJwtConfig): void {
  process.env.REFRESH_JWT_PUBLIC_KEY = config.publicKey;
  process.env.REFRESH_JWT_AUDIENCE = config.audience;
  process.env.REFRESH_JWT_ISSUER = config.issuer;
  process.env.REFRESH_JWT_EXPIRATION = config.expiresIn;
}

export function setEnvUserBaseStoreConfig(config: UserBaseStoreConfig): void {
  process.env.USERS_TABLE_NAME = config.tableName;
}

export function setEnvRefreshTokenBaseStoreConfig(config: RefreshTokenBaseStoreConfig): void {
  process.env.REFRESH_TOKENS_TABLE_NAME = config.tableName;
}

export function setEnvBaseConfig(config: BaseConfig): void {
  process.env.FRONTEND_DOMAIN = config.frontendDomain;
}
