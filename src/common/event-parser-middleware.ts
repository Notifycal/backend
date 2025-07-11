import { parser } from '@aws-lambda-powertools/parser/middleware';
import type { MiddlewareObj, Request } from '@middy/core';

import type { OptionalCorsEndpointConfig } from '@model/Config';
import type { EventWithConfig } from '@model/lambda-events/Event';
import {
  _validateRequestHeaderOrigin,
  baseHeaders,
  errorHandler,
  headers
} from '@services/common/api-response-handlers';
import type { Context } from 'aws-lambda';
import type { z } from 'zod';
import { logger } from './powertools';
import { hasCorsConfig } from './utils-middleware';

function eventParser<
  TConfig extends OptionalCorsEndpointConfig,
  TSchema extends z.ZodObject,
  TResult
>(
  request: Request<EventWithConfig<TConfig>, TResult, Error, Context>,
  schema: TSchema,
  isApiRequest: boolean
): TResult | void {
  const parserFn = parser({ schema }).before;
  if (parserFn) {
    try {
      parserFn(request);
    } catch (error: unknown) {
      const baseMsg = `payload does not satisfy the schema`;
      const errorMsg = `Lambda ${baseMsg}`;
      if (isApiRequest) {
        return errorHandler(
          400,
          hasCorsConfig(request.event.lambdaConfig)
            ? headers(
                _validateRequestHeaderOrigin(
                  request.event.lambdaConfig.corsConfig.allowedOrigins,
                  request.event.headers
                ) || ''
              )
            : baseHeaders()
        )(`Request ${baseMsg}`, { error: error, schema: schema.shape }) as TResult;
      } else {
        logger.error(errorMsg, { error: error, schema: schema.shape });
        throw new Error(errorMsg, { cause: error });
      }
    }
  }
}

export function eventParserMiddleware<
  TConfig extends OptionalCorsEndpointConfig,
  TSchema extends z.ZodObject,
  TResult
>(schema: TSchema, isApiRequest: boolean): MiddlewareObj<EventWithConfig<TConfig>, TResult> {
  return {
    before: (req) => eventParser(req, schema, isApiRequest)
  };
}
