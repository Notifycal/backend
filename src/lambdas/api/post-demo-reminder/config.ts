import type {
  AuthedEndpointConfig,
  DemoReminderToBeSentTopicConfig as DemoReminderTopicConfig
} from '@model/Config';
import {
  readAuthedEndpointConfig,
  readDemoReminderToBeSentTopicConfig,
  readEnv,
  readUserLiveIndexConfig
} from '@services/common/config';
import type { UserLiveIndexStoreEndpointConfig } from '@services/stores/user-live-index-store';
import { promiseTry } from '@utils/promises';

export type PostDemoReminderConfig = AuthedEndpointConfig &
  DemoReminderTopicConfig &
  UserLiveIndexStoreEndpointConfig;

export function readPostDemoReminderConfig(): Promise<PostDemoReminderConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAuthedEndpointConfig(env),
    ...readDemoReminderToBeSentTopicConfig(env),
    ...readUserLiveIndexConfig(env)
  }));
}
