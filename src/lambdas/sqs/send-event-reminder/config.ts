import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import { logger } from '@common/powertools';
import type {
  CreditServiceEndpointConfig,
  DemoReminderEndpointConfig,
  IdempotencyPersistenceConfig,
  MessagingAlertingEndpointConfig,
  MessagingEndpointConfig,
  MessagingTopicConfig
} from '@model/Config';
import type { VonageEndpointConfig } from '@model/vendor/vonage/config';
import {
  readCreditServiceConfig,
  readDemoReminderLimitConfig,
  readEnv,
  readIdempotencyPersistenceConfig,
  readMessagingAlertingConfig,
  readMessagingConfig,
  readMessagingTopicConfig,
  readUserBaseStoreConfig,
  readVonageConfig
} from '@services/common/config';
import { rethrowError, throwError } from '@services/common/error-handling';
import type { VonagePrivateKey } from '@services/messaging/vonage';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';

export type SendEventReminderConfig = VonageEndpointConfig &
  IdempotencyPersistenceConfig &
  MessagingTopicConfig &
  MessagingEndpointConfig &
  MessagingAlertingEndpointConfig &
  UserBaseStoreEndpointConfig &
  CreditServiceEndpointConfig &
  DemoReminderEndpointConfig;

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
        throwError(`Vonage Private key not found. Path: ${vonagePrivateKeyPath}`, logger);
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
      ...readMessagingAlertingConfig(env),
      ...readMessagingConfig(env),
      ...readUserBaseStoreConfig(env),
      ...readCreditServiceConfig(env),
      ...readDemoReminderLimitConfig(env)
    };
  } catch (err) {
    rethrowError(`Couldn't access SSM parameter`, err, logger);
  }
}
