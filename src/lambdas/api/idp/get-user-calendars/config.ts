import type { AuthedEndpointConfig, IdpEndpointConfig } from '@model/Config';
import {
  readBaseConfig,
  readDecodeAccessJwtConfig,
  readEnv,
  readIdpConfigs,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';
import type { APIGatewayProxyEvent } from 'aws-lambda';

export type GetUserCalendarsConfig = AuthedEndpointConfig &
  IdpEndpointConfig &
  UserBaseStoreEndpointConfig;

export function readGetUserCalendarListConfig(
  event: APIGatewayProxyEvent
): Promise<GetUserCalendarsConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readIdpConfigs(env),
    ...readUserBaseStoreConfig(env),
    ...readDecodeAccessJwtConfig(env),
    ...readBaseConfig(env, event.headers || {})
  }));
}
