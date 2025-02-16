import type {
  ActionableEventFoundTopicConfig,
  DeadLetterQueueConfig,
  IdpEndpointConfig
} from '@model/Config';
import {
  readActionableEventFoundTopicConfig,
  readDeadLetterQueueConfig,
  readEnv,
  readIdpConfigs
} from '@services/common/config';

export type ActionableEventsConfig = ActionableEventFoundTopicConfig &
  DeadLetterQueueConfig &
  IdpEndpointConfig;

export function readActionableEventsConfig(): ActionableEventsConfig {
  const env = readEnv();
  return {
    ...readActionableEventFoundTopicConfig(env),
    ...readDeadLetterQueueConfig(env),
    ...readIdpConfigs(env)
  };
}
