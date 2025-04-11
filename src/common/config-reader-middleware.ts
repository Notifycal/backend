import type { MiddlewareObj, Request } from '@middy/core';

import type { EventWithConfig } from '@model/lambda-events/Event';
import { errorHandler } from '@services/common/api-response-handlers';
import type { Context } from 'aws-lambda';
import { logger } from './powertools';

async function configReader<TConfig, TResult>(
  request: Request<EventWithConfig<TConfig>, TResult, Error, Context>,
  configReaderFn: () => Promise<TConfig>,
  isApiRequest: boolean = true
): Promise<TResult | void> {
  return configReaderFn().then(
    (config) => {
      request.event.lambdaConfig = config;
    },
    (error) => {
      if (isApiRequest) {
        return errorHandler(500)(`Endpoint config could not be loaded`, { error }) as TResult;
      } else {
        const errorMsg = `Lambda config could not be loaded`;
        logger.error(errorMsg, { error });
        return Promise.reject(new Error(errorMsg, { cause: error }));
      }
    }
  );
}

export function configReaderMiddleware<TConfig, TResult>(
  configReaderFn: () => Promise<TConfig>,
  isApiRequest: boolean
): MiddlewareObj<EventWithConfig<TConfig>, TResult> {
  return {
    before: (req) => configReader(req, configReaderFn, isApiRequest)
  };
}
