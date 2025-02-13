import type { ActionableEventFoundTopicEndpointConfig } from '@model/Config';
import { readActionableEventFoundTopicConfig, readEnv } from '@services/common/config';

export type ActionableEventsConfig = ActionableEventFoundTopicEndpointConfig;

export function readActionableEventsConfig(): ActionableEventsConfig {
  const env = readEnv();
  return {
    ...readActionableEventFoundTopicConfig(env)
  };
}
