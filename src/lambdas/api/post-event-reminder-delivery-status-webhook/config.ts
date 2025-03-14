import type {
  AuditTrailQueueConfig,
  BaseEndpointConfig,
  DecodeAccessJwtEndpointConfig
} from '@model/Config';
import {
  readAuditTrailQueueConfig,
  readBaseConfig,
  readDecodeAccessJwtConfig,
  readEnv
} from '@services/common/config';
import { promiseTry } from '@utils/promises';

export type ReminderDeliveryStatusWebhookConfig = BaseEndpointConfig &
  AuditTrailQueueConfig &
  DecodeAccessJwtEndpointConfig;

export function readReminderDeliveryStatusWebhookConfig(): Promise<ReminderDeliveryStatusWebhookConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readBaseConfig(env),
    ...readAuditTrailQueueConfig(env),
    ...readDecodeAccessJwtConfig(env)
  }));
}
