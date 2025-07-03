import type {
  AuthedEndpointConfig,
  DemoReminderEndpointConfig,
  DemoReminderToBeSentTopicConfig as DemoReminderTopicConfig
} from '@model/Config';
import {
  readAuthedEndpointConfig,
  readDemoReminderLimitConfig,
  readDemoReminderToBeSentTopicConfig,
  readEnv,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';

export type PostDemoReminderConfig = AuthedEndpointConfig &
  DemoReminderTopicConfig &
  UserBaseStoreEndpointConfig &
  DemoReminderEndpointConfig;

export function readPostDemoReminderConfig(): Promise<PostDemoReminderConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAuthedEndpointConfig(env),
    ...readDemoReminderToBeSentTopicConfig(env),
    ...readUserBaseStoreConfig(env),
    ...readDemoReminderLimitConfig(env)
  }));
}
