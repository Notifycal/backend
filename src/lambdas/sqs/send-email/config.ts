import type {
  EmailingEndpointConfig,
  EmailingTopicConfig,
  IdempotencyPersistenceConfig
} from '@model/Config';
import type { MailgunEndpointConfig } from '@model/vendor/mailgun';
import {
  readEmailingConfig,
  readEmailingTopicConfig,
  readEnv,
  readIdempotencyPersistenceConfig,
  readMailgunConfig
} from '@services/common/config';
import { promiseTry } from '@utils/promises';

export type SendEmailConfig = MailgunEndpointConfig &
  IdempotencyPersistenceConfig &
  EmailingTopicConfig &
  EmailingEndpointConfig;

export function readSendEmailConfig(): Promise<SendEmailConfig> {
  const env = readEnv();

  return promiseTry(() => ({
    ...readMailgunConfig(env),
    ...readIdempotencyPersistenceConfig(env),
    ...readEmailingTopicConfig(env),
    ...readEmailingConfig(env)
  }));
}
