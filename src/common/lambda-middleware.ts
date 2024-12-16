import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context,
  Handler
} from 'aws-lambda';
import { logger, metrics, tracer } from '@powertools';
import middy from '@middy/core';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { ParsedResult } from '@aws-lambda-powertools/parser/types';
import { Payload } from 'lambdas/api/login';

export function apply(
  handler: Handler
): middy.MiddyfiedHandler<
  ParsedResult<APIGatewayProxyEventV2, Payload>,
  APIGatewayProxyStructuredResultV2,
  Error,
  Context
> {
  return middy(handler, { timeoutEarlyInMillis: 0 })
    .use(captureLambdaHandler(tracer))
    .use(injectLambdaContext(logger, { logEvent: true }))
    .use(logMetrics(metrics, { captureColdStartMetric: true }));
}

export function handleInputValidation<T>(
  input: ParsedResult<APIGatewayProxyEventV2, T>
): Promise<T> {
  if (input.success) {
    return Promise.resolve<T>(input.data as T);
  } else {
    return Promise.reject(input.error);
  }
}
