import { readEnv, readUserLiveIndexConfig } from '@services/common/config';
import type { UserLiveIndexStoreEndpointConfig } from '@services/stores/user-live-index-store';

export type FetchUserCalendarsConfig = UserLiveIndexStoreEndpointConfig;

export function readFetchUserCalendarsConfig(): FetchUserCalendarsConfig {
  const env = readEnv();
  return {
    ...readUserLiveIndexConfig(env)
  };
}
