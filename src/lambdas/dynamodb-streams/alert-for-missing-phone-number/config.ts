import type { EmailToBeSentTopicConfig } from '@model/Config';
import {
  readAlertsBaseStoreConfig,
  readAlertThresholdConfig,
  readEmailToBeSentTopicConfig,
  readEnv,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { AlertsBaseStoreEndpointConfig } from '@services/stores/alerts-base-store';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';

export interface AlertThresholdConfig {
  errorRateThreshold: number;
  maxNotificationsPerDay: number;
  countThresholdToEnableTrigger: number;
}
export interface AlertThresholdEndpointConfig {
  alertThresholdConfig: AlertThresholdConfig;
}

export type AlertForMissingPhoneNumberConfig = AlertsBaseStoreEndpointConfig &
  UserBaseStoreEndpointConfig &
  EmailToBeSentTopicConfig &
  AlertThresholdEndpointConfig;

export function readAlertForMissingPhoneNumberConfig(): Promise<AlertForMissingPhoneNumberConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAlertsBaseStoreConfig(env),
    ...readUserBaseStoreConfig(env),
    ...readEmailToBeSentTopicConfig(env),
    ...readAlertThresholdConfig(env)
  }));
}
