import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logger, metrics, tracer } from '@common/powertools';
import middy, { type MiddlewareObj } from '@middy/core';
import type {
  AuthedEndpointConfig,
  CorsEndpointConfig,
  DecodeAccessJwtConfig,
  OptionalCorsEndpointConfig
} from '@model/Config';
import { accessTokenSchema } from '@model/Jwt';
import type { AuthedAPIEventWithConfig } from '@model/lambda-events/ApiGatewayEvents';
import type {
  ConfigReaderFn,
  JwtClaimCheckerFn,
  JwtDecoderAndSignatureVerifierFn
} from '@own-types/model';
import {
  setupLoggerCorrelationIdApi,
  setupLoggerForAuthedApiRequest
} from '@services/common/logger';
import { decodeAndVerifyJwtSignature } from '@services/jwt';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { z } from 'zod';
import { configReaderMiddleware } from './config-reader-middleware';
import { corsMiddleware } from './cors-middleware';
import { eventParserMiddleware } from './event-parser-middleware';
import { checkClaims, jwtVerificationMiddleware } from './jwt-verification-middleware';
import { setupMiddleware } from './setup-middleware';

function baseMiddleware(): middy.MiddyfiedHandler {
  return middy({
    timeoutEarlyInMillis: 0
  })
    .use(captureLambdaHandler(tracer))
    .use(injectLambdaContext(logger, { logEvent: true }))
    .use(logMetrics(metrics, { captureColdStartMetric: true }));
}

function baseConfigMiddleware<TConfig, TResult>(
  configReaderFn: ConfigReaderFn<Promise<TConfig>>,
  isApiRequest: boolean
): middy.MiddyfiedHandler {
  return baseMiddleware().use(
    configReaderMiddleware<TConfig, TResult>(configReaderFn, isApiRequest)
  );
}

export function backgroundProcessingMiddleware<TConfig, T extends z.AnyZodObject, TRequest>(
  configReaderFn: ConfigReaderFn<Promise<TConfig>>,
  eventSchema: T,
  loggerSetup?: (req: TRequest) => void
): middy.MiddyfiedHandler {
  const apiRequest = false;
  return baseConfigMiddleware(() => configReaderFn(), false)
    .use(setupMiddleware({ setupFn: loggerSetup }))
    .use(eventParserMiddleware(eventSchema, apiRequest));
}

const noOpMiddleware: MiddlewareObj = {
  before: () => {}
};

export function unprotectedEndpointMiddleware<TConfig, T extends z.AnyZodObject>(
  configReaderFn: ConfigReaderFn<Promise<TConfig>>,
  eventSchema: T,
  enableCors: boolean
): middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult> {
  return baseConfigMiddleware(() => configReaderFn(), true)
    .use(setupMiddleware<APIGatewayProxyEvent>({ setupFn: setupLoggerCorrelationIdApi }))
    .use(eventParserMiddleware(eventSchema, true))
    .use(enableCors ? corsMiddleware() : noOpMiddleware) as middy.MiddyfiedHandler<
    APIGatewayProxyEvent,
    APIGatewayProxyResult
  >;
}

export function unprotectedCrossDomainEndpointMiddleware<TConfig, T extends z.AnyZodObject>(
  configReaderFn: ConfigReaderFn<Promise<TConfig>>,
  eventSchema: T
): middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult> {
  const enableCors = true;
  return unprotectedEndpointMiddleware(configReaderFn, eventSchema, enableCors);
}

export function protectedEndpointMiddlewareCustom<
  TDecodeAccessJwtConfig,
  TConfig extends AuthedEndpointConfig<OptionalCorsEndpointConfig, TDecodeAccessJwtConfig>,
  TEventSchema extends z.AnyZodObject,
  TAccessTokenSchema extends z.AnyZodObject
>(
  configReaderFn: ConfigReaderFn<Promise<TConfig>>,
  eventSchema: TEventSchema,
  accessTokenSchema: TAccessTokenSchema,
  jwtDecoderAndSignatureVerifierFn: JwtDecoderAndSignatureVerifierFn<
    TAccessTokenSchema,
    TDecodeAccessJwtConfig
  >,
  claimCheckerFn: JwtClaimCheckerFn<z.infer<typeof accessTokenSchema>, TConfig>,
  enableCors: boolean,
  loggerSetup: (req: z.infer<typeof accessTokenSchema>) => void
): middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult> {
  return baseConfigMiddleware(() => configReaderFn(), true)
    .use(setupMiddleware<APIGatewayProxyEvent>({ setupFn: setupLoggerCorrelationIdApi }))
    .use(
      jwtVerificationMiddleware(accessTokenSchema, jwtDecoderAndSignatureVerifierFn, claimCheckerFn)
    )
    .use(
      setupMiddleware<AuthedAPIEventWithConfig<unknown, TAccessTokenSchema>>({
        setupFn: (req) => {
          loggerSetup(req.requestContext.authorizer);
        }
      })
    )
    .use(eventParserMiddleware<TConfig, TEventSchema, APIGatewayProxyResult>(eventSchema, true))
    .use(enableCors ? corsMiddleware() : noOpMiddleware) as middy.MiddyfiedHandler<
    APIGatewayProxyEvent,
    APIGatewayProxyResult
  >;
}

export function protectedEndpointMiddleware<
  TDecodeAccessJwtConfig extends DecodeAccessJwtConfig,
  TConfig extends AuthedEndpointConfig<CorsEndpointConfig, TDecodeAccessJwtConfig>,
  TEventSchema extends z.AnyZodObject
>(
  configReaderFn: ConfigReaderFn<Promise<TConfig>>,
  eventSchema: TEventSchema
): middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult> {
  const enableCors = true;
  return protectedEndpointMiddlewareCustom<
    TDecodeAccessJwtConfig,
    AuthedEndpointConfig<CorsEndpointConfig, TDecodeAccessJwtConfig>,
    TEventSchema,
    typeof accessTokenSchema
  >(
    configReaderFn,
    eventSchema,
    accessTokenSchema,
    decodeAndVerifyJwtSignature<typeof accessTokenSchema, TDecodeAccessJwtConfig>,
    checkClaims,
    enableCors,
    setupLoggerForAuthedApiRequest
  ) as unknown as middy.MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult>;
}
