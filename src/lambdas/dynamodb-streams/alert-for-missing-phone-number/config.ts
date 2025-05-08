import type { EmailToBeSentTopicConfig } from '@model/Config';
import {
  readAlertsBaseStoreConfig,
  readEmailToBeSentTopicConfig,
  readEnv
} from '@services/common/config';
import type { AlertsBaseStoreEndpointConfig } from '@services/stores/alerts-base-store';
import { promiseTry } from '@utils/promises';

export type AlertForMissingPhoneNumberConfig = AlertsBaseStoreEndpointConfig &
  EmailToBeSentTopicConfig;

export function readAlertForMissingPhoneNumberConfig(): Promise<AlertForMissingPhoneNumberConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAlertsBaseStoreConfig(env),
    ...readEmailToBeSentTopicConfig(env)
  }));
}
