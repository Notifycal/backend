import type { EmailingSenderEndpointConfig, EmailToBeSentTopicConfig } from '@model/Config';
import {
  readEmailingSenderConfig,
  readEmailToBeSentTopicConfig,
  readEnv
} from '@services/common/config';
import { promiseTry } from '@utils/promises';

export type AlertForEventsConfig = EmailToBeSentTopicConfig & EmailingSenderEndpointConfig;

export function readAlertForEventsConfig(): Promise<AlertForEventsConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readEmailToBeSentTopicConfig(env),
    ...readEmailingSenderConfig(env)
  }));
}
