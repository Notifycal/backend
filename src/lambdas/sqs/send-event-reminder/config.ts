import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import { logger } from '@common/powertools';
import type {
  AuditTrailQueueConfig,
  IdempotencyPersistenceConfig,
  VonageConfig
} from '@model/Config';
import {
  readAuditTrailQueueConfig,
  readEnv,
  readIdempotencyPersistenceConfig,
  readVonageConfig
} from '@services/common/config';
import { extractErrorMessage, throwError } from '@services/common/error-handling';
import type { VonagePrivateKey } from '@services/messaging';

export type SendEventReminderConfig = {
  vonageConfig: VonageConfig;
  vonagePrivateKey: VonagePrivateKey;
} & IdempotencyPersistenceConfig &
  AuditTrailQueueConfig;

export async function readSendEventReminderConfig(vonagePrivateKeyCache: {
  ssmParameter?: string;
}): Promise<SendEventReminderConfig> {
  const env = readEnv();

  try {
    if (!vonagePrivateKeyCache || !vonagePrivateKeyCache.ssmParameter) {
      logger.info('Retrieving SSM parameter from readSendEventReminderConfig.');
      const vonagePrivateKey = await getParameter(
        env.get('VONAGE_SSM_PATH_PRIVATE_KEY').required().asString(),
        {
          decrypt: true
        }
      );
      if (vonagePrivateKey) {
        // eslint-disable-next-line require-atomic-updates
        vonagePrivateKeyCache.ssmParameter = vonagePrivateKey;
      } else {
        throwError(`Vonage Private key not found`);
      }
      logger.info('SSM parameter retrieved.');
    } else {
      logger.info('Using cached parameter, not retrieving anything.');
    }

    return {
      vonageConfig: readVonageConfig(env),
      vonagePrivateKey: vonagePrivateKeyCache.ssmParameter as VonagePrivateKey,
      ...readIdempotencyPersistenceConfig(env),
      ...readAuditTrailQueueConfig(env)
    };
  } catch (err) {
    throwError(`Couldn't access SSM parameter. Error: ${extractErrorMessage(err)}`);
  }
}
