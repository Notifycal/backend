import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import type { IdempotencyConfig, VonageConfig } from '@model/Config';
import { readEnv, readIdempotencyConfig, readVonageConfig } from '@services/common/config';

import { extractErrorMessage, throwError } from '@services/common/error-handling';

export type SendEventReminderConfig = VonageConfig & IdempotencyConfig & { ssmParameter: string };

export async function readSendEventReminderConfig(ssmParameterObject: {
  ssmParameter?: string;
}): Promise<SendEventReminderConfig> {
  const env = readEnv();

  try {
    if (!ssmParameterObject || !ssmParameterObject.ssmParameter) {
      console.log('Retrieving SSM parameter from readSendEventReminderConfig.');
      const vonagePrivateKey = await getParameter(
        env.get('VONAGE_SSM_PATH_PRIVATE_KEY').required().asString()
      );
      if (vonagePrivateKey) {
        // eslint-disable-next-line require-atomic-updates
        ssmParameterObject.ssmParameter = vonagePrivateKey;
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
      ssmParameter: ssmParameterObject.ssmParameter
    };
  } catch (err) {
    throwError(`Couldn't access SSM parameter. Error: ${extractErrorMessage(err)}`);
  }
}
