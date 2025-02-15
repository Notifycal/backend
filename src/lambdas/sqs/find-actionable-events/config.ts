import type {
  ActionableEventFoundTopicConfig,
  DeadLetterQueueConfig
} from '@model/Config';
import {
  readActionableEventFoundTopicConfig,
  readDeadLetterQueueConfig,
  readEnv
} from '@services/common/config';

export type ActionableEventsConfig = ActionableEventFoundTopicConfig &
  DeadLetterQueueConfig;

export function readActionableEventsConfig(): ActionableEventsConfig {
  const env = readEnv();
  return {
    ...readActionableEventFoundTopicConfig(env),
    ...readDeadLetterQueueConfig(env)
  };
}
