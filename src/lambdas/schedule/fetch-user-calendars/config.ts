import type { UserCalendarFetchedTopicEndpointConfig } from '@model/Config';
import {
  readCronRunConfig,
  readEnv,
  readUserCalendarFetchedTopicConfig,
  readUserLiveIndexConfig
} from '@services/common/config';
import type { UserLiveIndexStoreEndpointConfig } from '@services/stores/user-live-index-store';

export interface CronRunConfig {
  windowInMinutes: number;
}
export interface CronRunEndpointConfig {
  cronRunConfig: CronRunConfig;
}

export type FetchUserCalendarsConfig = UserLiveIndexStoreEndpointConfig &
  UserCalendarFetchedTopicEndpointConfig &
  CronRunEndpointConfig;

export function readFetchUserCalendarsConfig(): FetchUserCalendarsConfig {
  const env = readEnv();
  return {
    ...readUserLiveIndexConfig(env),
    ...readUserCalendarFetchedTopicConfig(env),
    ...readCronRunConfig(env)
  };
}
