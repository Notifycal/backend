import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logger, metrics, tracer } from '@common/powertools';
import middy from '@middy/core';
import type { AuthedEndpointConfig } from '@model/Config';
import type { ConfigReaderFn, JwtClaimCheckerFn } from '@own-types/model';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { z } from 'zod';
import { configReaderMiddleware } from './config-reader-middleware';
import { corsMiddleware } from './cors-middleware';
import { checkClaims, jwtVerificationMiddleware } from './jwt-verification-middleware';
import { eventParserMiddleware } from './parser-http-middleware';

function baseMiddleware(): middy.MiddyfiedHandler {
  return middy({
    timeoutEarlyInMillis: 0
  })
    .use(captureLambdaHandler(tracer))
    .use(injectLambdaContext(logger, { logEvent: true }))
    .use(logMetrics(metrics, { captureColdStartMetric: true }));
}

function baseConfigMiddleware<TConfig, TResult>(
  configReader: ConfigReaderFn<TConfig>,
  isApiRequest: boolean
): middy.MiddyfiedHandler {
  return baseMiddleware().use(configReaderMiddleware<TConfig, TResult>(configReader, isApiRequest));
}

export function backgroundProcessingMiddleware<TConfig, T extends z.AnyZodObject>(
  configReader: ConfigReaderFn<TConfig>,
  eventSchema: T
): middy.MiddyfiedHandler {
  return baseConfigMiddleware(configReader, false).use(eventParserMiddleware(eventSchema, false));
}

export function unprotectedEndpointMiddleware<TConfig, T extends z.AnyZodObject>(
  configReader: ConfigReaderFn<TConfig>,
  eventSchema: T
): middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult> {
  return baseConfigMiddleware(configReader, true)
    .use(corsMiddleware())
    .use(eventParserMiddleware(eventSchema, true)) as unknown as middy.MiddyfiedHandler<
    APIGatewayProxyEvent,
    APIGatewayProxyResult
  >;
}

export function protectedEndpointMiddleware<
  TConfig extends AuthedEndpointConfig,
  T extends z.AnyZodObject
>(
  configReaderFn: ConfigReaderFn<TConfig>,
  eventSchema: T,
  claimCheckerFn: JwtClaimCheckerFn = checkClaims
): middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult> {
  return baseConfigMiddleware(configReaderFn, true)
    .use(corsMiddleware())
    .use(jwtVerificationMiddleware(claimCheckerFn))
    .use(eventParserMiddleware(eventSchema, true)) as unknown as middy.MiddyfiedHandler<
    APIGatewayProxyEvent,
    APIGatewayProxyResult
  >;
}
