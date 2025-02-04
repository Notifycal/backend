import type { MiddlewareObj, Request } from '@middy/core';
/* eslint-disable-next-line no-duplicate-imports */
import type middy from '@middy/core';
import type { EventWithConfig } from '@model/lambda-events/Event';
import { errorHandler } from '@services/common/api-response-handlers';
import { extractErrorMessage } from '@services/common/error-handling';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';

function configReader<TConfig, TResult>(
  request: Request<EventWithConfig<TConfig>, TResult, Error, Context>,
  configReaderFn: () => TConfig
): APIGatewayProxyResult | void {
  try {
    const config = configReaderFn();
    request.event.lambdaConfig = config;
  } catch (error: unknown) {
    return errorHandler(500)(
      `Endpoint config could not be loaded. Error: ${extractErrorMessage(error)}`
    );
  }
}

export function configReaderMiddleware<TConfig, TResult>(
  configReaderFn: () => TConfig
): MiddlewareObj<EventWithConfig<TConfig>, TResult> {
  const before: middy.MiddlewareFn<EventWithConfig<TConfig>, TResult> = (req) =>
    configReader(req, configReaderFn);
  return {
    before
  };
}
