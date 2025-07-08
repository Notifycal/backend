import type { EmailingSenderEndpointConfig, EmailToBeSentTopicConfig } from '@model/Config';
import {
  readEmailingSenderConfig,
  readEmailToBeSentTopicConfig,
  readEnv
} from '@services/common/config';
import { promiseTry } from '@utils/promises';

export type AlertForLowAndInsufficientCreditConfig = EmailToBeSentTopicConfig &
  EmailingSenderEndpointConfig;

export function readAlertForLowAndInsufficientCreditConfig(): Promise<AlertForLowAndInsufficientCreditConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readEmailToBeSentTopicConfig(env),
    ...readEmailingSenderConfig(env)
  }));
}
