import type { EmailToBeSentTopicConfig } from '@model/Config';
import {
  readAlertsBaseStoreConfig,
  readAlertThresholdConfig,
  readEmailToBeSentTopicConfig,
  readEnv
} from '@services/common/config';
import type { AlertsBaseStoreEndpointConfig } from '@services/stores/alerts-base-store';
import { promiseTry } from '@utils/promises';

export interface AlertThresholdConfig {
  errorRateThreshold: number;
  countThresholdToEnableTrigger: number;
}
export interface AlertThresholdEndpointConfig {
  alertThresholdConfig: AlertThresholdConfig;
}

export type AlertForMissingPhoneNumberConfig = AlertsBaseStoreEndpointConfig &
  EmailToBeSentTopicConfig &
  AlertThresholdEndpointConfig;

export function readAlertForMissingPhoneNumberConfig(): Promise<AlertForMissingPhoneNumberConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAlertsBaseStoreConfig(env),
    ...readEmailToBeSentTopicConfig(env),
    ...readAlertThresholdConfig(env)
  }));
}
