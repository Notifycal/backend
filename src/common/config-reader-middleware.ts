import type { MiddlewareObj, Request } from '@middy/core';
/* eslint-disable-next-line no-duplicate-imports */
import type middy from '@middy/core';
import type { APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import type { EventWithConfig } from '@model/ApiGatewayEvents';
import { errorHandler } from '@services/common/api-response-handlers';

function configReader<TConfig>(
  request: Request<EventWithConfig<TConfig>, APIGatewayProxyStructuredResultV2, Error, Context>,
  configReaderFn: () => TConfig
): APIGatewayProxyStructuredResultV2 | void {
  try {
    const config = configReaderFn();
    request.event.requestContext.config = config;
  } catch (error) {
    return errorHandler(500)(`Endpoint config could not be loaded. Error: ${error}`);
  }
}

export function configReaderMiddleware<TConfig>(
  configReaderFn: () => TConfig
): MiddlewareObj<EventWithConfig<TConfig>, APIGatewayProxyStructuredResultV2> {
  const before: middy.MiddlewareFn<EventWithConfig<TConfig>, APIGatewayProxyStructuredResultV2> = (
    req
  ) => configReader(req, configReaderFn);
  return {
    before
  };
}