import middy, { MiddlewareObj } from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { Request } from '@middy/core';
import { APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import createHttpError from 'http-errors';
import { EventWithConfig } from '@model/ApiGatewayEvents';
import { logger } from './powertools';

export function configReaderMiddleware<TConfig>(
  configReaderFn: () => TConfig
): MiddlewareObj<EventWithConfig<TConfig>, APIGatewayProxyStructuredResultV2> {
  const before: middy.MiddlewareFn<EventWithConfig<TConfig>, APIGatewayProxyStructuredResultV2> = (
    req
  ) => configReader(req, configReaderFn);
  const onError = httpErrorHandler({ logger: (error) => logger.error(error) }).onError;
  return {
    before,
    onError
  };
}

function configReader<TConfig>(
  request: Request<EventWithConfig<TConfig>, APIGatewayProxyStructuredResultV2, Error, Context>,
  configReaderFn: () => TConfig
): void {
  try {
    const config = configReaderFn();
    request.event.requestContext.config = config;
  } catch (error) {
    throw createHttpError(500, JSON.stringify({ message: 'KO' }), {
      type: `Endpoint config could not be loaded. Error: ${error}`,
      // This flag is necessary so @middy/httpErrorHandler returns what you expect.
      expose: true
    });
  }
}
