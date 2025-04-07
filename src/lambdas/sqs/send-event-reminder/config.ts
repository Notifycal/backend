import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import { logger } from '@common/powertools';
import type {
  IdempotencyPersistenceConfig,
  MessagingEndpointConfig,
  MessagingTopicConfig
} from '@model/Config';
import type { VonageConfig } from '@model/vendor/vonage';
import {
  readEnv,
  readIdempotencyPersistenceConfig,
  readMessagingConfig,
  readMessagingTopicConfig,
  readVonageConfig
} from '@services/common/config';
import { throwError } from '@services/common/error-handling';
import type { VonagePrivateKey } from '@services/messaging';

export type SendEventReminderConfig = {
  vonageConfig: VonageConfig & { privateKey: VonagePrivateKey };
} & IdempotencyPersistenceConfig &
  MessagingTopicConfig &
  MessagingEndpointConfig;

export async function readSendEventReminderConfig(vonagePrivateKeyCache: {
  vonagePrivateKey?: string;
}): Promise<SendEventReminderConfig> {
  const env = readEnv();

  try {
    if (!vonagePrivateKeyCache || !vonagePrivateKeyCache.vonagePrivateKey) {
      const vonagePrivateKeyPath = env.get('VONAGE_SSM_PATH_PRIVATE_KEY').required().asString();
      logger.info(
        `Retrieving SSM parameter from readSendEventReminderConfig. Path: ${vonagePrivateKeyPath}`
      );
      const vonagePrivateKey = await getParameter(vonagePrivateKeyPath, {
        decrypt: true
      });
      if (vonagePrivateKey) {
        // eslint-disable-next-line require-atomic-updates
        vonagePrivateKeyCache.vonagePrivateKey = vonagePrivateKey;
      } else {
        throwError(`Vonage Private key not found. Path: ${vonagePrivateKeyPath}`);
      }
      logger.info('SSM parameter retrieved.');
    } else {
      logger.info('Using cached parameter, not retrieving anything.');
    }

    return {
      vonageConfig: {
        ...readVonageConfig(env),
        privateKey: vonagePrivateKeyCache.vonagePrivateKey as VonagePrivateKey
      },
      ...readIdempotencyPersistenceConfig(env),
      ...readMessagingTopicConfig(env),
      ...readMessagingConfig(env)
    };
  } catch (err) {
    throwError(`Couldn't access SSM parameter`, err);
  }
}
