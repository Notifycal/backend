import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { logger, metrics, tracer } from '@common/powertools';
import middy from '@middy/core';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { ParsedResult } from '@aws-lambda-powertools/parser/types';

export function baseMiddleware(): middy.MiddyfiedHandler {
  return middy({ timeoutEarlyInMillis: 0 })
    .use(captureLambdaHandler(tracer))
    .use(injectLambdaContext(logger, { logEvent: true }))
    .use(logMetrics(metrics, { captureColdStartMetric: true }));
}

export function handleInputValidation<T>(
  input: ParsedResult<APIGatewayProxyEventV2, T>
): Promise<T> {
  if (input.success) {
    return Promise.resolve<T>(input.data);
  } else {
    return Promise.reject(input.error);
  }
}
