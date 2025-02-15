import type {
  ActionableEventFoundTopicEndpointConfig,
  DeadLetterQueueEndpointConfig
} from '@model/Config';
import {
  readActionableEventFoundTopicConfig,
  readDeadLetterQueueConfig,
  readEnv
} from '@services/common/config';

export type ActionableEventsConfig = ActionableEventFoundTopicEndpointConfig &
  DeadLetterQueueEndpointConfig;

export function readActionableEventsConfig(): ActionableEventsConfig {
  const env = readEnv();
  return {
    ...readActionableEventFoundTopicConfig(env),
    ...readDeadLetterQueueConfig(env)
  };
}
