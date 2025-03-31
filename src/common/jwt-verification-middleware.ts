import type { MiddlewareObj, Request } from '@middy/core';
/* eslint-disable-next-line no-duplicate-imports */
import type middy from '@middy/core';
import type { AuthedEndpointConfig, OptionalCorsEndpointConfig } from '@model/Config';
import type { AccessToken } from '@model/Jwt';
import type { AuthedAPIEventWithConfig } from '@model/lambda-events/ApiGatewayEvents';
import type { Jwt } from '@notifycal/shared/types';
import type { JwtClaimCheckerFn, JwtDecoderAndSignatureVerifierFn } from '@own-types/model';
import {
  headers as _headers,
  baseHeaders,
  errorHandler
} from '@services/common/api-response-handlers';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import type { z } from 'zod';
import { hasCorsConfig } from './utils-middleware';

function jwtVerification<
  TDecodeAccessJwtConfig,
  TConfig extends AuthedEndpointConfig<OptionalCorsEndpointConfig, TDecodeAccessJwtConfig>,
  TAccessTokenSchema extends z.ZodTypeAny
>(
  accessTokenSchema: TAccessTokenSchema,
  request: Request<
    AuthedAPIEventWithConfig<TConfig, z.infer<typeof accessTokenSchema>>,
    APIGatewayProxyResult,
    Error,
    Context
  >,
  jwtDecoderAndSignatureVerifierFn: JwtDecoderAndSignatureVerifierFn<
    TAccessTokenSchema,
    TDecodeAccessJwtConfig
  >,
  claimCheckerFn: JwtClaimCheckerFn<z.infer<typeof accessTokenSchema>, TConfig>
): Promise<APIGatewayProxyResult | void> {
  const requestHeaders = request.event.headers ?? {};
  const authorization = requestHeaders['Authorization'] || requestHeaders['authorization'];
  const requestContext = request.event.requestContext;
  const config = request.event.lambdaConfig;
  const earlyResponseHeaders = hasCorsConfig(config)
    ? _headers(config.corsConfig.frontendDomain)
    : baseHeaders();
  if (!authorization) {
    return Promise.resolve(errorHandler(401, earlyResponseHeaders)('Missing Authorization'));
  }
  const token = authorization.trim().replace('Bearer ', '') as Jwt;
  return jwtDecoderAndSignatureVerifierFn(
    token,
    accessTokenSchema,
    config.decodeAccessJwtConfig
  ).then(
    (jwt) => {
      if (claimCheckerFn(jwt, config)) {
        request.event.requestContext = {
          ...requestContext,
          authorizer: jwt
        };
      } else {
        return errorHandler(401, earlyResponseHeaders)(`Missing permissions to hit the API`, {
          header: jwt.header,
          payload: jwt.payload
        });
      }
    },
    (err: unknown) => {
      return errorHandler(401, earlyResponseHeaders)(`Invalid Signature`, { error: err });
    }
  );
}

export function jwtVerificationMiddleware<
  TDecodeAccessJwtConfig,
  TConfig extends AuthedEndpointConfig<OptionalCorsEndpointConfig, TDecodeAccessJwtConfig>,
  TAccessTokenSchema extends z.ZodTypeAny
>(
  accessTokenSchema: TAccessTokenSchema,
  jwtDecoderAndSignatureVerifierFn: JwtDecoderAndSignatureVerifierFn<
    TAccessTokenSchema,
    TDecodeAccessJwtConfig
  >,
  claimCheckerFn: JwtClaimCheckerFn<z.infer<typeof accessTokenSchema>, TConfig>
): MiddlewareObj<
  AuthedAPIEventWithConfig<TConfig, z.infer<typeof accessTokenSchema>>,
  APIGatewayProxyResult
> {
  const before: middy.MiddlewareFn<
    AuthedAPIEventWithConfig<TConfig, z.infer<typeof accessTokenSchema>>,
    APIGatewayProxyResult
  > = (req) =>
    jwtVerification(accessTokenSchema, req, jwtDecoderAndSignatureVerifierFn, claimCheckerFn);
  return {
    before
  };
}

export function checkClaims<TAccessToken extends AccessToken>(jwt: TAccessToken): boolean {
  return jwt.payload.role === 'user';
}
