import type { MiddlewareObj, Request } from '@middy/core';
/* eslint-disable-next-line no-duplicate-imports */
import type middy from '@middy/core';
import type { EventWithConfig } from '@model/lambda-events/Event';
import { errorHandler } from '@services/common/api-response-handlers';
import { extractErrorMessage } from '@services/common/error-handling';
import type { Context } from 'aws-lambda';
import { logger } from './powertools';

function configReader<TConfig, TResult>(
  request: Request<EventWithConfig<TConfig>, TResult, Error, Context>,
  configReaderFn: () => TConfig,
  isApiRequest: boolean = true
): TResult | void {
  try {
    const config = configReaderFn();
    request.event.lambdaConfig = config;
  } catch (error: unknown) {
    if (isApiRequest) {
      return errorHandler(500)(
        `Endpoint config could not be loaded. Error: ${extractErrorMessage(error)}`
      ) as TResult;
    } else {
      const errorMsg = `Lambda config could not be loaded. Error: ${extractErrorMessage(error)}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
}

export function configReaderMiddleware<TConfig, TResult>(
  configReaderFn: () => TConfig,
  isApiRequest: boolean
): MiddlewareObj<EventWithConfig<TConfig>, TResult> {
  const before: middy.MiddlewareFn<EventWithConfig<TConfig>, TResult> = (req) =>
    configReader(req, configReaderFn, isApiRequest);
  return {
    before
  };
}
