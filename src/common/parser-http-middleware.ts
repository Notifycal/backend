import { parser } from '@aws-lambda-powertools/parser/middleware';
import type { MiddlewareObj, Request } from '@middy/core';
/* eslint-disable-next-line no-duplicate-imports */
import type middy from '@middy/core';
import type { BaseEndpointConfig } from '@model/Config';
import type { EventWithConfig } from '@model/lambda-events/Event';
import { baseHeaders, errorHandler, headers } from '@services/common/api-response-handlers';
import { extractErrorMessage } from '@services/common/error-handling';
import type { Context } from 'aws-lambda';
import type { z } from 'zod';
import { logger } from './powertools';

function eventParser<TConfig extends BaseEndpointConfig, TSchema extends z.AnyZodObject, TResult>(
  request: Request<EventWithConfig<TConfig>, TResult, Error, Context>,
  schema: TSchema,
  isApiRequest: boolean
): TResult | void {
  const parserFn = parser({ schema }).before;
  if (parserFn) {
    try {
      parserFn(request);
    } catch (error: unknown) {
      const baseMsg = `payload does not satisfy the schema. Error: ${extractErrorMessage(error)}. Schema: ${JSON.stringify(schema.shape)}`;
      if (isApiRequest) {
        return errorHandler(
          400,
          request.event.lambdaConfig.baseConfig.frontendDomain
            ? headers(request.event.lambdaConfig.baseConfig.frontendDomain)
            : baseHeaders()
        )(`Request ${baseMsg}`) as TResult;
      } else {
        const errorMsg = `Lambda ${baseMsg}`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
    }
  }
}

export function eventParserMiddleware<
  TConfig extends BaseEndpointConfig,
  TSchema extends z.AnyZodObject,
  TResult
>(schema: TSchema, isApiRequest: boolean): MiddlewareObj<EventWithConfig<TConfig>, TResult> {
  const before: middy.MiddlewareFn<EventWithConfig<TConfig>, TResult> = (
    req: Request<EventWithConfig<TConfig>, TResult, Error, Context>
  ) => eventParser(req, schema, isApiRequest);
  return {
    before
  };
}
