import type { BaseEndpointConfig } from '@model/Config';
import { readBaseConfig, readEnv } from '@services/common/config';
import { promiseTry } from '@utils/promises';

export type ReminderDeliveryStatusWebhookConfig = BaseEndpointConfig;

export function readReminderDeliveryStatusWebhookConfig(): Promise<ReminderDeliveryStatusWebhookConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readBaseConfig(env)
  }));
}
