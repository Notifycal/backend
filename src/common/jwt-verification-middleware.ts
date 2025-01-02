import type { AuthedEventWithConfig } from '../model/ApiGatewayEvents';
import type { MiddlewareObj, Request } from '@middy/core';
/* eslint-disable-next-line no-duplicate-imports */
import type middy from '@middy/core';
import type { APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { decodeAndVerifyJwtSignature } from '@services/jwt';
import type { JwtClaimCheckerFn } from '@own-types/model';
import type { AuthedEndpointConfig } from '@model/Config';
import { type AccessToken, accessTokenSchema } from '@model/Jwt';
import { errorHandler } from '@services/common/api-response-handlers';
import { extractErrorMessage } from '@services/common/error-handling';

function jwtVerification<TConfig extends AuthedEndpointConfig>(
  request: Request<
    AuthedEventWithConfig<TConfig>,
    APIGatewayProxyStructuredResultV2,
    Error,
    Context
  >,
  claimChecker: JwtClaimCheckerFn
): Promise<APIGatewayProxyStructuredResultV2 | void> {
  const headers = request.event.headers ?? {};
  const authorization = headers['Authorization'] || headers['authorization'];
  if (authorization) {
    return decodeAndVerifyJwtSignature(
      authorization.replace('Bearer ', ''),
      accessTokenSchema,
      request.event.requestContext.config.decodeAccessJwtConfig
    ).then(
      (jwt) => {
        if (claimChecker(jwt)) {
          request.event.requestContext.authorizer = jwt;
        } else {
          return errorHandler(401)(
            `Missing permissions to hit the API. Provided info: header = '${JSON.stringify(jwt.header)}' payload = '${JSON.stringify(jwt.payload)}'`
          );
        }
      },
      (err: unknown) => {
        return errorHandler(401)(`Invalid Signature. Error: ${extractErrorMessage(err)}`);
      }
    );
  } else {
    return Promise.resolve(errorHandler(401)('Missing Authorization'));
  }
}

export function jwtVerificationMiddleware<TConfig extends AuthedEndpointConfig>(
  claimChecker: JwtClaimCheckerFn
): MiddlewareObj<AuthedEventWithConfig<TConfig>, APIGatewayProxyStructuredResultV2> {
  const before: middy.MiddlewareFn<
    AuthedEventWithConfig<TConfig>,
    APIGatewayProxyStructuredResultV2
  > = (req) => jwtVerification(req, claimChecker);
  return {
    before
  };
}

export function checkClaims(jwt: AccessToken): boolean {
  return jwt.payload.role === 'user';
}
