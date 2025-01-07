import { parser } from '@aws-lambda-powertools/parser/middleware';
import type { MiddlewareObj, Request } from '@middy/core';
/* eslint-disable-next-line no-duplicate-imports */
import type middy from '@middy/core';
import type { EventWithConfig } from '@model/ApiGatewayEvents';
import type { BaseEndpointConfig } from '@model/Config';
import { errorHandler, headers } from '@services/common/api-response-handlers';
import { extractErrorMessage } from '@services/common/error-handling';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import type { ZodSchema } from 'zod';

function httpRequestEventParser<TConfig extends BaseEndpointConfig>(
  request: Request<EventWithConfig<TConfig>, APIGatewayProxyResult, Error, Context>,
  schema: ZodSchema
): APIGatewayProxyResult | void {
  const parserFn = parser({ schema }).before;
  if (parserFn) {
    try {
      parserFn(request);
    } catch (error: unknown) {
      return errorHandler(
        400,
        headers(request.event.endpointConfig.baseConfig.frontendDomain)
      )(
        `Request payload does not satisfy the schema. Error: ${extractErrorMessage(error)}. Schema: ${JSON.stringify(schema)}`
      );
    }
  }
}

export function httpRequestEventParserMiddleware<TConfig extends BaseEndpointConfig>(
  schema: ZodSchema
): MiddlewareObj<EventWithConfig<TConfig>, APIGatewayProxyResult> {
  const before: middy.MiddlewareFn<EventWithConfig<TConfig>, APIGatewayProxyResult> = (
    req: Request<EventWithConfig<TConfig>, APIGatewayProxyResult, Error, Context>
  ) => httpRequestEventParser(req, schema);
  return {
    before
  };
}
