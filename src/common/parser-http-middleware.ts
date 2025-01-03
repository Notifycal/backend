import { parser } from '@aws-lambda-powertools/parser/middleware';
import type { MiddlewareObj, Request } from '@middy/core';
/* eslint-disable-next-line no-duplicate-imports */
import type middy from '@middy/core';
import { errorHandler } from '@services/common/api-response-handlers';
import { extractErrorMessage } from '@services/common/error-handling';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import type { ZodSchema } from 'zod';

function httpRequestEventParser(
  request: Request<APIGatewayProxyEvent, APIGatewayProxyResult, Error, Context>,
  schema: ZodSchema
): APIGatewayProxyResult | void {
  const parserFn = parser({ schema }).before;
  if (parserFn) {
    try {
      parserFn(request);
    } catch (error: unknown) {
      return errorHandler(400)(
        `Request payload does not satisfy the schema. Error: ${extractErrorMessage(error)}. Schema: ${JSON.stringify(schema)}`
      );
    }
  }
}

export function httpRequestEventParserMiddleware(
  schema: ZodSchema
): MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> {
  const before: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = (
    req: Request<APIGatewayProxyEvent, APIGatewayProxyResult, Error, Context>
  ) => httpRequestEventParser(req, schema);
  return {
    before
  };
}
