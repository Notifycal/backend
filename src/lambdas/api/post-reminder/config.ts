import type { AuthedEndpointConfig, ReminderToBeSentTopicConfig } from '@model/Config';
import {
  readAuthedEndpointConfig,
  readEnv,
  readReminderToBeSentTopicConfig,
  readUserLiveIndexConfig
} from '@services/common/config';
import type { UserLiveIndexStoreEndpointConfig } from '@services/stores/user-live-index-store';
import { promiseTry } from '@utils/promises';

export type PostReminderConfig = AuthedEndpointConfig &
  ReminderToBeSentTopicConfig &
  UserLiveIndexStoreEndpointConfig;

export function readPostReminderConfig(): Promise<PostReminderConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAuthedEndpointConfig(env),
    ...readReminderToBeSentTopicConfig(env),
    ...readUserLiveIndexConfig(env)
  }));
}
