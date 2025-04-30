import type { MessagingTopicConfig } from '@model/Config';
import type { DecodeVonageAccessJwtEndpointConfig } from '@model/vendor/vonage/config';
import {
  readDecodeVonageJwtConfig,
  readEnv,
  readMessagingTopicConfig
} from '@services/common/config';
import { promiseTry } from '@utils/promises';

export type ReminderDeliveryStatusWebhookConfig = DecodeVonageAccessJwtEndpointConfig &
  MessagingTopicConfig;

export function readReminderDeliveryStatusWebhookConfig(): Promise<ReminderDeliveryStatusWebhookConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readDecodeVonageJwtConfig(env),
    ...readMessagingTopicConfig(env)
  }));
}
