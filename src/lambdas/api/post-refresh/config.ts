import {
  AwsConfig,
  DecodeRefreshJwtConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import {
  readAwsConfig,
  readDecodeRefreshJwtConfig,
  readEncodeAccessJwtConfig,
  readEncodeRefreshJwtConfig,
  readEnv
} from '@services/common/config';
import { RefreshTokenBaseStoreConfig } from '@services/refresh-token-base-store';

export interface RefreshConfig {
  encodeAccessJwtConfig: EncodeAccessJwtConfig;
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig;
  decodeRefreshJwtConfig: DecodeRefreshJwtConfig;
  refreshTokenBaseStoreConfig: RefreshTokenBaseStoreConfig;
  awsConfig: AwsConfig;
}

export function readRefreshConfig(): RefreshConfig {
  const env = readEnv();
  return {
    encodeAccessJwtConfig: readEncodeAccessJwtConfig(env),
    encodeRefreshJwtConfig: readEncodeRefreshJwtConfig(env),
    decodeRefreshJwtConfig: readDecodeRefreshJwtConfig(env),
    refreshTokenBaseStoreConfig: {
      tableName: env.get('REFRESH_TOKENS_TABLE_NAME').required().asString()
    },
    awsConfig: readAwsConfig(env)
  };
}
