import type { ActionableEventFoundTopicConfig, AuthedEndpointConfig } from '@model/Config';
import {
  readActionableEventFoundTopicConfig,
  readAuthedEndpointConfig,
  readEnv
} from '@services/common/config';
import { promiseTry } from '@utils/promises';

export type PostReminderConfig = AuthedEndpointConfig & ActionableEventFoundTopicConfig;

export function readPostReminderConfig(): Promise<PostReminderConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAuthedEndpointConfig(env),
    ...readActionableEventFoundTopicConfig(env)
  }));
}
