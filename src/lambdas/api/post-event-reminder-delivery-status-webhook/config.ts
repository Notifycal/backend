import type { AuditTrailQueueConfig, BaseEndpointConfig } from '@model/Config';
import { readAuditTrailQueueConfig, readBaseConfig, readEnv } from '@services/common/config';
import { promiseTry } from '@utils/promises';

export type ReminderDeliveryStatusWebhookConfig = BaseEndpointConfig & AuditTrailQueueConfig;

export function readReminderDeliveryStatusWebhookConfig(): Promise<ReminderDeliveryStatusWebhookConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readBaseConfig(env),
    ...readAuditTrailQueueConfig(env)
  }));
}
