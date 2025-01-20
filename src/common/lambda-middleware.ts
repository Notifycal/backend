import { logger, metrics, tracer } from '@common/powertools';
import middy from '@middy/core';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { configReaderMiddleware } from './config-reader-middleware';
import { checkClaims, jwtVerificationMiddleware } from './jwt-verification-middleware';
import { httpRequestEventParserMiddleware } from './parser-http-middleware';
import type { ConfigReaderFn, JwtClaimCheckerFn } from '@own-types/model';
import type { z } from 'zod';
import type { AuthedEndpointConfig } from '@model/Config';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { corsMiddleware } from './cors-middleware';
import type { EventSchemaFn } from '@model/ApiGatewayEvents';

export function baseMiddleware(): middy.MiddyfiedHandler<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> {
  return middy<APIGatewayProxyEvent, APIGatewayProxyResult>({
    timeoutEarlyInMillis: 0
  })
    .use(captureLambdaHandler(tracer))
    .use(injectLambdaContext(logger, { logEvent: true }))
    .use(logMetrics(metrics, { captureColdStartMetric: true }));
}

export function unprotectedEndpointMiddleware<TConfig, T extends z.ZodTypeAny>(
  configReader: ConfigReaderFn<TConfig>,
  eventSchemaFn: EventSchemaFn<T>
): middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult> {
  return baseMiddleware()
    .use(configReaderMiddleware<TConfig>(configReader))
    .use(corsMiddleware())
    .use(httpRequestEventParserMiddleware(eventSchemaFn)) as unknown as middy.MiddyfiedHandler<
    APIGatewayProxyEvent,
    APIGatewayProxyResult
  >;
}

export function protectedEndpointMiddleware<
  TConfig extends AuthedEndpointConfig,
  TSchema extends z.ZodTypeAny
>(
  configReaderFn: ConfigReaderFn<TConfig>,
  eventSchema: EventSchemaFn<TSchema>,
  claimCheckerFn: JwtClaimCheckerFn = checkClaims
): middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult> {
  return baseMiddleware()
    .use(configReaderMiddleware<TConfig>(configReaderFn))
    .use(corsMiddleware())
    .use(jwtVerificationMiddleware(claimCheckerFn))
    .use(httpRequestEventParserMiddleware(eventSchema)) as unknown as middy.MiddyfiedHandler<
    APIGatewayProxyEvent,
    APIGatewayProxyResult
  >;
}
