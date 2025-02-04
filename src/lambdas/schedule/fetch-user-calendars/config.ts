import {
  readEnv,
  readUserCalendarFetchedTopicConfig,
  readUserLiveIndexConfig
} from '@services/common/config';
import type {
  UserCalendarFetchedTopicEndpointConfig,
  UserLiveIndexStoreEndpointConfig
} from '@services/stores/user-live-index-store';

export type FetchUserCalendarsConfig = UserLiveIndexStoreEndpointConfig &
  UserCalendarFetchedTopicEndpointConfig;

export function readFetchUserCalendarsConfig(): FetchUserCalendarsConfig {
  const env = readEnv();
  return {
    ...readUserLiveIndexConfig(env),
    ...readUserCalendarFetchedTopicConfig(env)
  };
}
