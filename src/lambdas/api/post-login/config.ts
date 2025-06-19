import type {
  ApiRestTopicConfig,
  CorsEndpointConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig,
  IdpEndpointConfig
} from '@model/Config';
import {
  readApiRestTopicConfig,
  readBaseConfig,
  readEncodeJwtsConfig,
  readEnv,
  readIdpConfigs,
  readRefreshTokenStoreConfig,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { RefreshTokenBaseStoreConfig } from '@services/stores/refresh-token-base-store';
import type { UserBaseStoreConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';
import type { APIGatewayProxyEvent } from 'aws-lambda';

export interface BaseLoginConfig {
  encodeAccessJwtConfig: EncodeAccessJwtConfig;
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig;
  userBaseStoreConfig: UserBaseStoreConfig;
  refreshTokenBaseStoreConfig: RefreshTokenBaseStoreConfig;
}

export type LoginConfig = BaseLoginConfig &
  CorsEndpointConfig &
  IdpEndpointConfig &
  ApiRestTopicConfig;

export function readLoginConfig(event: APIGatewayProxyEvent): Promise<LoginConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readEncodeJwtsConfig(env),
    ...readIdpConfigs(env),
    ...readUserBaseStoreConfig(env),
    ...readRefreshTokenStoreConfig(env),
    ...readApiRestTopicConfig(env),
    ...readBaseConfig(env, event.headers)
  }));
}
