import type {
  ActionableEventFoundTopicConfig,
  AuditTrailQueueConfig,
  DeadLetterQueueConfig,
  IdpEndpointConfig
} from '@model/Config';
import {
  readActionableEventFoundTopicConfig,
  readAuditTrailQueueConfig,
  readDeadLetterQueueConfig,
  readEnv,
  readIdpConfigs
} from '@services/common/config';
import { promiseTry } from '@utils/promises';

export type ActionableEventsConfig = ActionableEventFoundTopicConfig &
  DeadLetterQueueConfig &
  IdpEndpointConfig &
  AuditTrailQueueConfig;

export function readActionableEventsConfig(): Promise<ActionableEventsConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readActionableEventFoundTopicConfig(env),
    ...readDeadLetterQueueConfig(env),
    ...readIdpConfigs(env),
    ...readAuditTrailQueueConfig(env)
  }));
}
