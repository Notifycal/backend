import type {
  EmailingEndpointConfig,
  EmailingTopicConfig,
  IdempotencyPersistenceConfig
} from '@model/Config';
import type { Url } from '@own-types/model';
import {
  readEmailingConfig,
  readEmailingTopicConfig,
  readEnv,
  readIdempotencyPersistenceConfig,
  readMailgunConfig
} from '@services/common/config';
import { promiseTry } from '@utils/promises';
export interface MailgunConfig {
  apiKey: string;
  baseUrl: Url;
  domainName: string;
}

export type SendEmailConfig = MailgunConfig &
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
