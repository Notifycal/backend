import type { CronRunEndpointConfig, UserCalendarFetchedTopicConfig } from '@model/Config';
import {
  readCronRunConfig,
  readEnv,
  readUserCalendarFetchedTopicConfig,
  readUserLiveIndexConfig
} from '@services/common/config';
import type { UserLiveIndexStoreEndpointConfig } from '@services/stores/user-live-index-store';
import { promiseTry } from '@utils/promises';

export type FetchUserCalendarsConfig = UserLiveIndexStoreEndpointConfig &
  UserCalendarFetchedTopicConfig &
  CronRunEndpointConfig;

export function readFetchUserCalendarsConfig(): Promise<FetchUserCalendarsConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readUserLiveIndexConfig(env),
    ...readUserCalendarFetchedTopicConfig(env),
    ...readCronRunConfig(env)
  }));
}
