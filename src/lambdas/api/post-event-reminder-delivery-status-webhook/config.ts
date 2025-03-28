import type { AuditTrailQueueConfig } from '@model/Config';
import type { DecodeVonageAccessJwtEndpointConfig } from '@model/vendor/vonage';
import {
  readAuditTrailQueueConfig,
  readDecodeVonageJwtConfig,
  readEnv
} from '@services/common/config';
import { promiseTry } from '@utils/promises';

export type ReminderDeliveryStatusWebhookConfig = AuditTrailQueueConfig &
  DecodeVonageAccessJwtEndpointConfig;

export function readReminderDeliveryStatusWebhookConfig(): Promise<ReminderDeliveryStatusWebhookConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAuditTrailQueueConfig(env),
    ...readDecodeVonageJwtConfig(env)
  }));
}
