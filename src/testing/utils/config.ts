import type {
  BaseConfig,
  DecodeAccessJwtConfig,
  DecodeRefreshJwtConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig,
  IdpConfigs
} from '@model/Config';
import type { RefreshTokenBaseStoreConfig } from '@services/stores/refresh-token-base-store';
import type { UserBaseStoreConfig } from '@services/stores/user-base-store';
import { match } from 'ts-pattern';

export const fakeIdpConfigs: IdpConfigs = {
  'google.com': {
    clientId: 'some_valid_google_app_url',
    clientSecret: 'some_valid_secret',
    redirectUri: 'http://localhost:5173'
  }
};

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

export function setEnvIdpConfigs(configs: IdpConfigs): void {
  Object.keys(configs).forEach((idp) => {
    match(idp)
      .with('google.com', (idp) => {
        process.env.GOOGLE_OAUTH_CLIENT_ID = configs[idp].clientId;
        process.env.GOOGLE_OAUTH_CLIENT_SECRET = configs[idp].clientSecret;
        process.env.GOOGLE_OAUTH_CLIENT_REDIRECT_URI = configs[idp].redirectUri;
      })
      .otherwise((v) => {
        throw new Error(`Environment could not be set for all Idps. Missing idp: ${v}`);
      });
  });
}
