import type { ActionableEventFoundTopicEndpointConfig, IdpEndpointConfig } from '@model/Config';
import {
  readActionableEventFoundTopicConfig,
  readEnv,
  readIdpConfigs
} from '@services/common/config';

export type ActionableEventsConfig = ActionableEventFoundTopicEndpointConfig & IdpEndpointConfig;

export function readActionableEventsConfig(): ActionableEventsConfig {
  const env = readEnv();
  return {
    ...readActionableEventFoundTopicConfig(env),
    ...readIdpConfigs(env)
  };
}
