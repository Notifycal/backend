import type { MiddlewareObj, Request } from '@middy/core';
/* eslint-disable-next-line no-duplicate-imports */
import type middy from '@middy/core';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import type { EventWithConfig } from '@model/ApiGatewayEvents';
import { errorHandler } from '@services/common/api-response-handlers';
import { extractErrorMessage } from '@services/common/error-handling';

async function configReader<TConfig>(
  request: Request<EventWithConfig<TConfig>, APIGatewayProxyResult, Error, Context>,
  configReaderFn: () => Promise<TConfig>
): Promise<APIGatewayProxyResult | void> {
  await configReaderFn().then(
    (config) => {
      request.event.endpointConfig = config;
    },
    (error: unknown) =>
      errorHandler(500)(`Endpoint config could not be loaded. Error: ${extractErrorMessage(error)}`)
  );
}

export function configReaderMiddleware<TConfig>(
  configReaderFn: () => Promise<TConfig>
): MiddlewareObj<EventWithConfig<TConfig>, APIGatewayProxyResult> {
  const before: middy.MiddlewareFn<EventWithConfig<TConfig>, APIGatewayProxyResult> = (req) =>
    configReader(req, configReaderFn);
  return {
    before
  };
}
