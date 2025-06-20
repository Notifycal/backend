import type { MiddlewareObj, Request } from '@middy/core';

import type { EventWithConfig } from '@model/lambda-events/Event';
import type { ConfigReaderFn } from '@own-types/model';
import { errorHandler } from '@services/common/api-response-handlers';
import type { Context } from 'aws-lambda';
import type { SupportedEvents } from './lambda-middleware';
import { logger } from './powertools';

function configReader<TRequest extends SupportedEvents, TConfig, TResult>(
  request: Request<TRequest, TResult, Error, Context>,
  configReaderFn: ConfigReaderFn<TRequest, Promise<TConfig>>,
  isApiRequest: boolean = true
): Promise<TResult | void> {
  return configReaderFn(request.event).then(
    (config) => {
      (request.event as EventWithConfig<TConfig>).lambdaConfig = config;
    },
    (error) => {
      if (isApiRequest) {
        return errorHandler(500)('Endpoint config could not be loaded', {
          error
        }) as TResult;
      } else {
        const errorMsg = 'Lambda config could not be loaded';
        logger.error(errorMsg, { error });
        return Promise.reject(new Error(errorMsg, { cause: error }));
      }
    }
  );
}

export function configReaderMiddleware<TRequest extends SupportedEvents, TConfig, TResult>(
  configReaderFn: ConfigReaderFn<TRequest, Promise<TConfig>>,
  isApiRequest: boolean
): MiddlewareObj<TRequest, TResult> {
  return {
    before: (req) => configReader(req, configReaderFn, isApiRequest)
  };
}
