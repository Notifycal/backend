import { parser } from '@aws-lambda-powertools/parser/middleware';
import middy, { MiddlewareObj } from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { Request } from '@middy/core';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import createHttpError from 'http-errors';
import { ZodSchema } from 'zod';
import { logger } from './powertools';

export function httpRequestEventParserMiddleware(
  schema: ZodSchema
): MiddlewareObj<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2> {
  const before: middy.MiddlewareFn<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2> = (
    req
  ) => httpRequestEventParser(req, schema);
  const onError = httpErrorHandler({ logger: (error) => logger.warn(error) }).onError;
  return {
    before,
    onError
  };
}

function httpRequestEventParser(
  request: Request<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Error, Context>,
  schema: ZodSchema
): void {
  const parserFn = parser({ schema }).before;
  if (parserFn) {
    try {
      parserFn(request);
    } catch (error) {
      throw createHttpError(400, JSON.stringify({ message: 'Bad Request' }), {
        type: `Request payload does not satisfy the schema. Error: ${error}. Schema: ${JSON.stringify(schema)}`
      });
    }
  }
}
