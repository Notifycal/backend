import { parser } from '@aws-lambda-powertools/parser/middleware';
import type { MiddlewareObj, Request } from '@middy/core';
/* eslint-disable-next-line no-duplicate-imports */
import type middy from '@middy/core';
import { errorHandler } from '@services/common/api-response-handlers';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import type { ZodSchema } from 'zod';

function httpRequestEventParser(
  request: Request<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Error, Context>,
  schema: ZodSchema
): APIGatewayProxyStructuredResultV2 | void {
  const parserFn = parser({ schema }).before;
  if (parserFn) {
    try {
      parserFn(request);
    } catch (error) {
      return errorHandler(400)(
        `Request payload does not satisfy the schema. Error: ${error}. Schema: ${JSON.stringify(schema)}`
      );
    }
  }
}

export function httpRequestEventParserMiddleware(
  schema: ZodSchema
): MiddlewareObj<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2> {
  const before: middy.MiddlewareFn<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2> = (
    req: Request<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Error, Context>
  ) => httpRequestEventParser(req, schema);
  return {
    before
  };
}