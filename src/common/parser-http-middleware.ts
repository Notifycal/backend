import { parser } from '@aws-lambda-powertools/parser/middleware';
import middy, { MiddlewareObj } from '@middy/core';
import { Request } from '@middy/core';
import { errorHandler } from '@services/common/api-response-handlers';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { ZodSchema } from 'zod';

export function httpRequestEventParserMiddleware(
  schema: ZodSchema
): MiddlewareObj<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2> {
  const before: middy.MiddlewareFn<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2> = (
    req
  ) => httpRequestEventParser(req, schema);
  return {
    before
  };
}

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
