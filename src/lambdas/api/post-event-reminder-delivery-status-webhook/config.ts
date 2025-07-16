import type { CreditServiceEndpointConfig, MessagingTopicConfig } from '@model/Config';
import type { DecodeVonageAccessJwtEndpointConfig } from '@model/vendor/vonage/config';
import {
  readCreditServiceConfig,
  readDecodeVonageJwtConfig,
  readEnv,
  readMessagingTopicConfig,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';

export type ReminderDeliveryStatusWebhookConfig = DecodeVonageAccessJwtEndpointConfig &
  MessagingTopicConfig &
  UserBaseStoreEndpointConfig &
  CreditServiceEndpointConfig;

export function readReminderDeliveryStatusWebhookConfig(): Promise<ReminderDeliveryStatusWebhookConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readDecodeVonageJwtConfig(env),
    ...readMessagingTopicConfig(env),
    ...readUserBaseStoreConfig(env),
    ...readCreditServiceConfig(env)
  }));
}
