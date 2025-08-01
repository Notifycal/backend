import type { EmailingSenderEndpointConfig, EmailToBeSentTopicConfig } from '@model/Config';
import {
  readAlertEmailConfig,
  readEmailingSenderConfig,
  readEmailToBeSentTopicConfig,
  readEnv,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';
import type { AlertEmailEndpointConfig } from '../alert-for-missing-phone-number/config';

export type AlertForEventsConfig = EmailToBeSentTopicConfig &
  EmailingSenderEndpointConfig &
  AlertEmailEndpointConfig &
  UserBaseStoreEndpointConfig;

export function readAlertForEventsConfig(): Promise<AlertForEventsConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readEmailToBeSentTopicConfig(env),
    ...readEmailingSenderConfig(env),
    ...readUserBaseStoreConfig(env),
    ...readAlertEmailConfig(env)
  }));
}
