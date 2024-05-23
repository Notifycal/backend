import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context
} from 'aws-lambda';
import { logger, metrics, tracer } from '@powertools';
import middy from '@middy/core';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { ParsedResult } from '@aws-lambda-powertools/parser/types';

export function apply(handler: (event: any, ctx: Context) => Promise<APIGatewayProxyResult>): middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult, Error, Context> {
  return middy(handler, { timeoutEarlyInMillis: 0 })
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }));;
}

export function handleInputValidation<T>(input: ParsedResult<APIGatewayProxyEvent, T>, errorHandler?: Promise<any>): Promise<T> {
  if (input.success) {
    return Promise.resolve<T>(input.data as T);
  } else {
    return errorHandler ? errorHandler : Promise.reject(input.error);
  }
}
