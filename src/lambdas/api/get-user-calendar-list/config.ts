import {
  readBaseConfig,
  readDecodeAccessJwtConfig,
  readEnv,
  readIdpConfigs
} from '@services/common/config';
import type { AuthedEndpointConfig, IdpEndpointConfig } from '@model/Config';

export type GetUserCalendarListConfig = AuthedEndpointConfig & IdpEndpointConfig;

export function readGetUserCalendarListConfig(): GetUserCalendarListConfig {
  const env = readEnv();
  return {
    ...readIdpConfigs(env),
    ...readDecodeAccessJwtConfig(env),
    ...readBaseConfig(env)
  };
}
