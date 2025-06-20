import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
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
  logEvent,
  setupLoggerCorrelationIdApi,
  setupLoggerForAuthedApiRequest
} from '@services/common/logger';
import { decodeAndVerifyJwtSignature } from '@services/jwt';
import type { APIGatewayProxyEvent, EventBridgeEvent, SQSEvent } from 'aws-lambda';
import type { z } from 'zod';
import { configReaderMiddleware } from './config-reader-middleware';
import { corsMiddleware } from './cors-middleware';
import { eventParserMiddleware } from './event-parser-middleware';
import { checkClaims, jwtVerificationMiddleware } from './jwt-verification-middleware';
import { metricsMiddleware } from './metrics-middleware';
import { setupMiddleware } from './setup-middleware';

export type SupportedEvents = APIGatewayProxyEvent | EventBridgeEvent<string, unknown> | SQSEvent;

function baseMiddleware(): middy.MiddyfiedHandler {
  return middy({
    timeoutEarlyInMillis: 0
  })
    .use(captureLambdaHandler(tracer))
    .use(injectLambdaContext(logger, { logEvent: true }))
    .use(metricsMiddleware(metrics, { captureColdStartMetric: true }));
}

function baseConfigMiddleware<TEvent extends SupportedEvents, TConfig>(
  configReaderFn: ConfigReaderFn<TEvent, Promise<TConfig>>,
  isApiRequest: boolean
): middy.MiddyfiedHandler {
  return baseMiddleware().use(configReaderMiddleware(configReaderFn, isApiRequest));
}

export function backgroundProcessingMiddleware<
  TConfig,
  TEventSchema extends z.AnyZodObject,
  TEvent extends SupportedEvents
>(
  configReaderFn: ConfigReaderFn<TEvent, Promise<TConfig>>,
  eventSchema: TEventSchema,
  loggerSetup?: (event: TEvent) => void
): middy.MiddyfiedHandler {
  const apiRequest = false;
  return baseConfigMiddleware(configReaderFn, false)
    .use(setupMiddleware({ setupFn: loggerSetup }))
    .use(eventParserMiddleware(eventSchema, apiRequest))
    .use(setupMiddleware({ setupFn: logEvent }));
}

const noOpMiddleware: MiddlewareObj = {
  before: () => {}
};

export function unprotectedEndpointMiddleware<
  TEvent extends SupportedEvents,
  TConfig,
  TEventSchema extends z.AnyZodObject
>(
  configReaderFn: ConfigReaderFn<TEvent, Promise<TConfig>>,
  eventSchema: TEventSchema,
  enableCors: boolean
): middy.MiddyfiedHandler {
  return baseConfigMiddleware(configReaderFn, true)
    .use(setupMiddleware({ setupFn: setupLoggerCorrelationIdApi }))
    .use(enableCors ? corsMiddleware() : noOpMiddleware)
    .use(eventParserMiddleware(eventSchema, true))
    .use(setupMiddleware({ setupFn: logEvent }));
}

export function unprotectedCrossDomainEndpointMiddleware<
  TEvent extends SupportedEvents,
  TConfig,
  TEventSchema extends z.AnyZodObject
>(
  configReaderFn: ConfigReaderFn<TEvent, Promise<TConfig>>,
  eventSchema: TEventSchema
): middy.MiddyfiedHandler {
  const enableCors = true;
  return unprotectedEndpointMiddleware(configReaderFn, eventSchema, enableCors);
}

export function protectedEndpointMiddlewareCustom<
  TDecodeAccessJwtConfig,
  TConfig extends AuthedEndpointConfig<OptionalCorsEndpointConfig, TDecodeAccessJwtConfig>,
  TEventSchema extends z.AnyZodObject,
  TAccessTokenSchema extends z.AnyZodObject,
  TEvent extends SupportedEvents
>(
  configReaderFn: ConfigReaderFn<TEvent, Promise<TConfig>>,
  eventSchema: TEventSchema,
  accessTokenSchema: TAccessTokenSchema,
  jwtDecoderAndSignatureVerifierFn: JwtDecoderAndSignatureVerifierFn<
    TAccessTokenSchema,
    TDecodeAccessJwtConfig
  >,
  claimCheckerFn: JwtClaimCheckerFn<z.infer<typeof accessTokenSchema>, TConfig>,
  enableCors: boolean,
  loggerSetup: (req: z.infer<typeof accessTokenSchema>) => void
): middy.MiddyfiedHandler {
  return baseConfigMiddleware(configReaderFn, true)
    .use(setupMiddleware({ setupFn: setupLoggerCorrelationIdApi }))
    .use(enableCors ? corsMiddleware() : noOpMiddleware)
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
    .use(eventParserMiddleware(eventSchema, true))
    .use(setupMiddleware({ setupFn: logEvent }));
}

export function protectedEndpointMiddleware<
  TDecodeAccessJwtConfig extends DecodeAccessJwtConfig,
  TConfig extends AuthedEndpointConfig<CorsEndpointConfig, TDecodeAccessJwtConfig>,
  TEventSchema extends z.AnyZodObject,
  TEvent extends SupportedEvents
>(
  configReaderFn: ConfigReaderFn<TEvent, Promise<TConfig>>,
  eventSchema: TEventSchema
): middy.MiddyfiedHandler {
  const enableCors = true;
  return protectedEndpointMiddlewareCustom<
    TDecodeAccessJwtConfig,
    AuthedEndpointConfig<CorsEndpointConfig, TDecodeAccessJwtConfig>,
    TEventSchema,
    typeof accessTokenSchema,
    TEvent
  >(
    configReaderFn,
    eventSchema,
    accessTokenSchema,
    decodeAndVerifyJwtSignature<typeof accessTokenSchema, TDecodeAccessJwtConfig>,
    checkClaims,
    enableCors,
    setupLoggerForAuthedApiRequest
  );
}
