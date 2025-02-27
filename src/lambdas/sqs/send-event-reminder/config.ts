import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import type { AuditTrailQueueConfig, IdempotencyConfig, VonageConfig } from '@model/Config';
import {
  readAuditTrailQueueConfig,
  readEnv,
  readIdempotencyConfig,
  readVonageConfig
} from '@services/common/config';

import { extractErrorMessage, throwError } from '@services/common/error-handling';

export type SendEventReminderConfig = VonageConfig &
  IdempotencyConfig &
  AuditTrailQueueConfig & { ssmParameter: string };

export async function readSendEventReminderConfig(vonagePrivateKeyCache: {
  ssmParameter?: string;
}): Promise<SendEventReminderConfig> {
  const env = readEnv();

  try {
    if (!vonagePrivateKeyCache || !vonagePrivateKeyCache.ssmParameter) {
      console.log('Retrieving SSM parameter from readSendEventReminderConfig.');
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
      console.log('SSM parameter retrieved.');
    } else {
      console.log('Using cached parameter, not retrieving anything.');
    }

    return {
      ...readVonageConfig(env),
      ...readIdempotencyConfig(env),
      ...readAuditTrailQueueConfig(env),
      ssmParameter: vonagePrivateKeyCache.ssmParameter
    };
  } catch (err) {
    throwError(`Couldn't access SSM parameter. Error: ${extractErrorMessage(err)}`);
  }
}
