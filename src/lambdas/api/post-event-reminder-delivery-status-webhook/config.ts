import type {
  AuditTrailQueueConfig,
  BaseEndpointConfig,
  DecodeVonageAccessJwtEndpointConfig
} from '@model/Config';
import {
  readAuditTrailQueueConfig,
  readDecodeVonageJwtConfig,
  readEnv
} from '@services/common/config';
import { promiseTry } from '@utils/promises';

export type ReminderDeliveryStatusWebhookConfig = BaseEndpointConfig &
  AuditTrailQueueConfig &
  DecodeVonageAccessJwtEndpointConfig;

export function readReminderDeliveryStatusWebhookConfig(): Promise<ReminderDeliveryStatusWebhookConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...{
      baseConfig: {}
    },
    ...readAuditTrailQueueConfig(env),
    ...readDecodeVonageJwtConfig(env)
  }));
}
