import { readEnv, readIdempotencyConfig, readVonageConfig } from '@services/common/config';
import type { IdempotencyConfig, VonageConfig } from '@model/Config';

export type SendEventReminderConfig = VonageConfig & IdempotencyConfig;

export function readSendEventReminderConfig(): SendEventReminderConfig {
  const env = readEnv();
  return {
    ...readVonageConfig(env),
    ...readIdempotencyConfig(env)
  };
}
