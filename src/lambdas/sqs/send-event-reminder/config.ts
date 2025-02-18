import { readEnv, readIdempotencyConfig, readVonageConfig } from '@services/common/config';
import type { IdempotencyConfig, VonageConfig } from '@model/Config';

import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import { throwError, extractErrorMessage } from '@services/common/error-handling';

export type SendEventReminderConfig = VonageConfig & IdempotencyConfig & { ssmParameter: string };

export async function readSendEventReminderConfig(ssmParameterObject?: {ssmParameter?: string | undefined }): Promise<SendEventReminderConfig> {
  const env = readEnv();

  try {
    if (!ssmParameterObject || !ssmParameterObject.ssmParameter) {
      console.log('Retrieving SSM parameter from readSendEventReminderConfig.');
      const foo = await getParameter(env.get('VONAGE_SSM_PATH_PRIVATE_KEY').required().asString());
      ssmParameterObject = {
        ssmParameter: foo
      }
      console.log('SSM parameter retrieved.');
    } else {
      console.log('Using cached parameter, not retrieving anything.');
    }
  
    return {
      ...readVonageConfig(env),
      ...readIdempotencyConfig(env),
      ssmParameter: ssmParameterObject?.ssmParameter as string
    };
  } catch (err) {
    throwError(`Couldn't access SSM parameter. Error: ${extractErrorMessage(err)}`);
  }
}
