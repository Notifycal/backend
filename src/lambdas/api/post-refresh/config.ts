import type {
  AwsConfig,
  BaseEndpointConfig,
  DecodeRefreshJwtConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import {
  readAwsConfig,
  readBaseConfig,
  readDecodeRefreshJwtConfig,
  readEncodeAccessJwtConfig,
  readEncodeRefreshJwtConfig,
  readEnv
} from '@services/common/config';
import type { RefreshTokenBaseStoreConfig } from '@services/refresh-token-base-store';

export interface RefreshConfig extends BaseEndpointConfig {
  encodeAccessJwtConfig: EncodeAccessJwtConfig;
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig;
  decodeRefreshJwtConfig: DecodeRefreshJwtConfig;
  refreshTokenBaseStoreConfig: RefreshTokenBaseStoreConfig;
  awsConfig: AwsConfig;
}

export async function readRefreshConfig(): Promise<RefreshConfig> {
  const env = readEnv();
  const awsConfig = await readAwsConfig(env);
  return {
    encodeAccessJwtConfig: readEncodeAccessJwtConfig(env),
    encodeRefreshJwtConfig: readEncodeRefreshJwtConfig(env),
    decodeRefreshJwtConfig: readDecodeRefreshJwtConfig(env),
    refreshTokenBaseStoreConfig: {
      tableName: env.get('REFRESH_TOKENS_TABLE_NAME').required().asString()
    },
    baseConfig: readBaseConfig(env).baseConfig,
    awsConfig: awsConfig
  };
}
