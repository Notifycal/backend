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
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export function baseMiddleware(): middy.MiddyfiedHandler<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2> {
  return middy<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2>({ timeoutEarlyInMillis: 0 })
    .use(captureLambdaHandler(tracer))
    .use(injectLambdaContext(logger, { logEvent: true }))
    .use(logMetrics(metrics, { captureColdStartMetric: true }));
}

export function unprotectedEndpointMiddleware<TConfig, T extends z.ZodTypeAny>(
  configReader: ConfigReaderFn<TConfig>,
  eventSchema: T
): middy.MiddyfiedHandler<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2> {
  return baseMiddleware()
    .use(configReaderMiddleware<TConfig>(configReader))
    .use(httpRequestEventParserMiddleware(eventSchema)) as unknown as middy.MiddyfiedHandler<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2>;
}

export function protectedEndpointMiddleware<TConfig extends AuthedEndpointConfig,T extends z.ZodTypeAny>(
  configReaderFn: ConfigReaderFn<TConfig>,
  eventSchema: T,
  claimCheckerFn: JwtClaimCheckerFn = checkClaims
): middy.MiddyfiedHandler<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2> {
  return baseMiddleware()
    .use(configReaderMiddleware<TConfig>(configReaderFn))
    .use(jwtVerificationMiddleware(claimCheckerFn))
    .use(httpRequestEventParserMiddleware(eventSchema)) as unknown as middy.MiddyfiedHandler<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2>;
}
