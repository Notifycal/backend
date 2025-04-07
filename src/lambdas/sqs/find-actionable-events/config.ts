import type { ActionableEventFoundTopicConfig, IdpEndpointConfig } from '@model/Config';
import {
  readActionableEventFoundTopicConfig,
  readEnv,
  readIdpConfigs
} from '@services/common/config';
import { promiseTry } from '@utils/promises';

export type ActionableEventsConfig = ActionableEventFoundTopicConfig & IdpEndpointConfig;

export function readActionableEventsConfig(): Promise<ActionableEventsConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readActionableEventFoundTopicConfig(env),
    ...readIdpConfigs(env)
  }));
}
