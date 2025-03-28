import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import { logger } from '@common/powertools';
import type {
  AuditTrailQueueConfig,
  IdempotencyPersistenceConfig,
  MessagingEndpointConfig
} from '@model/Config';
import type { VonageConfig } from '@model/vendor/vonage';
import {
  readAuditTrailQueueConfig,
  readEnv,
  readIdempotencyPersistenceConfig,
  readMessagingConfig,
  readVonageConfig
} from '@services/common/config';
import { extractErrorMessage, throwError } from '@services/common/error-handling';
import type { VonagePrivateKey } from '@services/messaging';

export type SendEventReminderConfig = {
  vonageConfig: VonageConfig & { privateKey: VonagePrivateKey };
} & IdempotencyPersistenceConfig &
  AuditTrailQueueConfig &
  MessagingEndpointConfig;

export async function readSendEventReminderConfig(vonagePrivateKeyCache: {
  vonagePrivateKey?: string;
}): Promise<SendEventReminderConfig> {
  const env = readEnv();

  try {
    if (!vonagePrivateKeyCache || !vonagePrivateKeyCache.vonagePrivateKey) {
      logger.info('Retrieving SSM parameter from readSendEventReminderConfig.');
      const vonagePrivateKey = await getParameter(
        env.get('VONAGE_SSM_PATH_PRIVATE_KEY').required().asString(),
        {
          decrypt: true
        }
      );
      if (vonagePrivateKey) {
        // eslint-disable-next-line require-atomic-updates
        vonagePrivateKeyCache.vonagePrivateKey = vonagePrivateKey;
      } else {
        throwError(`Vonage Private key not found`);
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
      ...readAuditTrailQueueConfig(env),
      ...readMessagingConfig(env)
    };
  } catch (err) {
    throwError(`Couldn't access SSM parameter. Error: ${extractErrorMessage(err)}`);
  }
}
