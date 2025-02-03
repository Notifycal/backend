import type { MiddlewareObj, Request } from '@middy/core';
/* eslint-disable-next-line no-duplicate-imports */
import type middy from '@middy/core';
import type { AuthedAPIEventWithConfig } from '@model/lambda-events/ApiGatewayEvents';
import type { AuthedEndpointConfig } from '@model/Config';
import { type AccessToken, accessTokenSchema } from '@model/Jwt';
import type { Jwt } from '@notifycal/shared/types';
import type { JwtClaimCheckerFn } from '@own-types/model';
import { headers as _headers, errorHandler } from '@services/common/api-response-handlers';
import { extractErrorMessage } from '@services/common/error-handling';
import { decodeAndVerifyJwtSignature } from '@services/jwt';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';

function jwtVerification<TConfig extends AuthedEndpointConfig>(
  request: Request<AuthedAPIEventWithConfig<TConfig>, APIGatewayProxyResult, Error, Context>,
  claimChecker: JwtClaimCheckerFn
): Promise<APIGatewayProxyResult | void> {
  const headers = request.event.headers ?? {};
  const authorization = headers['Authorization'] || headers['authorization'];
  const requestContext = request.event.requestContext;
  const config = request.event.lambdaConfig;
  if (!authorization) {
    return Promise.resolve(
      errorHandler(401, _headers(config.baseConfig.frontendDomain))('Missing Authorization')
    );
  }
  const token = authorization.trim().replace('Bearer ', '') as Jwt;
  return decodeAndVerifyJwtSignature(token, accessTokenSchema, config.decodeAccessJwtConfig).then(
    (jwt) => {
      if (claimChecker(jwt)) {
        request.event.requestContext = {
          ...requestContext,
          authorizer: jwt
        };
      } else {
        return errorHandler(
          401,
          _headers(config.baseConfig.frontendDomain)
        )(
          `Missing permissions to hit the API. Provided info: header = '${JSON.stringify(
            jwt.header
          )}' payload = '${JSON.stringify(jwt.payload)}'`
        );
      }
    },
    (err: unknown) => {
      return errorHandler(
        401,
        _headers(config.baseConfig.frontendDomain)
      )(`Invalid Signature. Error: ${extractErrorMessage(err)}`);
    }
  );
}

export function jwtVerificationMiddleware<TConfig extends AuthedEndpointConfig>(
  claimChecker: JwtClaimCheckerFn
): MiddlewareObj<AuthedAPIEventWithConfig<TConfig>, APIGatewayProxyResult> {
  const before: middy.MiddlewareFn<AuthedAPIEventWithConfig<TConfig>, APIGatewayProxyResult> = (req) =>
    jwtVerification(req, claimChecker);
  return {
    before
  };
}

export function checkClaims(jwt: AccessToken): boolean {
  return jwt.payload.role === 'user';
}
