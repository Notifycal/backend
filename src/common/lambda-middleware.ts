import { logger, metrics, tracer } from '@common/powertools';
import middy from '@middy/core';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { configReaderMiddleware } from './config-reader-middleware';
import { checkClaims, jwtVerificationMiddleware } from './jwt-verification-middleware';
import { httpRequestEventParserMiddleware } from './parser-http-middleware';
import { ConfigReaderFn, JwtClaimCheckerFn } from '@own-types/model';
import { ZodSchema } from 'zod';
import { AuthedEndpointConfig } from '@model/Config';

export function baseMiddleware(): middy.MiddyfiedHandler {
  return middy({ timeoutEarlyInMillis: 0 })
    .use(captureLambdaHandler(tracer))
    .use(injectLambdaContext(logger, { logEvent: true }))
    .use(logMetrics(metrics, { captureColdStartMetric: true }));
}

export function unprotectedEndpointMiddleware<TConfig>(
  configReader: ConfigReaderFn<TConfig>,
  eventSchema: ZodSchema
): middy.MiddyfiedHandler {
  return baseMiddleware()
    .use(configReaderMiddleware<TConfig>(configReader))
    .use(httpRequestEventParserMiddleware(eventSchema));
}

export function protectedEndpointMiddleware<TConfig extends AuthedEndpointConfig>(
  configReaderFn: ConfigReaderFn<TConfig>,
  eventSchema: ZodSchema,
  claimCheckerFn: JwtClaimCheckerFn = checkClaims
): middy.MiddyfiedHandler {
  return baseMiddleware()
    .use(configReaderMiddleware<TConfig>(configReaderFn))
    .use(jwtVerificationMiddleware(claimCheckerFn))
    .use(httpRequestEventParserMiddleware(eventSchema));
}
