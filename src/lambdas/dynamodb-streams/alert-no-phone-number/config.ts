import type { EmailToBeSentTopicConfig } from '@model/Config';
import {
  readAlertNoPhoneNumber,
  readEmailToBeSentTopicConfig,
  readEnv
} from '@services/common/config';
import type { AlertNoPhoneNumberBaseStoreEndpointConfig } from '@services/stores/alert-no-phone-number-store';
import { promiseTry } from '@utils/promises';

export type AlertNoPhoneNumberConfig = AlertNoPhoneNumberBaseStoreEndpointConfig &
  EmailToBeSentTopicConfig;

export function readAlertNoPhoneNumberConfig(): Promise<AlertNoPhoneNumberConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAlertNoPhoneNumber(env),
    ...readEmailToBeSentTopicConfig(env)
  }));
}
