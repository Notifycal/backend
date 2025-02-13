import type {
  ActionableEventFoundTopicEndpointConfig,
  DeadLetterQueueEndpointConfig,
  IdpEndpointConfig
} from '@model/Config';
import {
  readActionableEventFoundTopicConfig,
  readDeadLetterQueueConfig,
  readEnv,
  readIdpConfigs
} from '@services/common/config';

export type ActionableEventsConfig = ActionableEventFoundTopicEndpointConfig &
  DeadLetterQueueEndpointConfig &
  IdpEndpointConfig;

export function readActionableEventsConfig(): ActionableEventsConfig {
  const env = readEnv();
  return {
    ...readActionableEventFoundTopicConfig(env),
    ...readDeadLetterQueueConfig(env),
    ...readIdpConfigs(env)
  };
}
