import { AuthedEventWithConfig } from '../model/ApiGatewayEvents';
import middy, { MiddlewareObj, Request } from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import createHttpError from 'http-errors';
import { APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { decodeAndVerifyJwtSignature } from '@services/jwt';
import { JwtPayload, Jwt as StructuredJwt } from 'jsonwebtoken';
import { JwtClaimCheckerFn } from '@own-types/model';
import { AuthedEndpointConfig } from '@model/Config';
import { logger } from '@common/powertools';
import { AccessToken } from '@model/Jwt';

export function jwtVerificationMiddleware<TConfig extends AuthedEndpointConfig>(
  claimChecker: JwtClaimCheckerFn
): MiddlewareObj<AuthedEventWithConfig<TConfig>, APIGatewayProxyStructuredResultV2> {
  const before: middy.MiddlewareFn<
    AuthedEventWithConfig<TConfig>,
    APIGatewayProxyStructuredResultV2
  > = (req) => jwtVerification(req, claimChecker);
  const onError = httpErrorHandler({ logger: (error) => logger.warn(error) }).onError;
  return {
    before,
    onError
  };
}

function jwtVerification<TConfig extends AuthedEndpointConfig>(
  request: Request<
    AuthedEventWithConfig<TConfig>,
    APIGatewayProxyStructuredResultV2,
    Error,
    Context
  >,
  claimChecker: JwtClaimCheckerFn
): void {
  const headers = request.event.headers ?? {};
  const authorization = headers['Authorization'] || headers['authorization'];
  if (authorization) {
    decodeAndVerifyJwtSignature<AccessToken>(
      authorization.replace('Bearer ', ''),
      request.event.requestContext.config.decodeJwtConfig
    ).then(
      (jwt) => {
        if (claimChecker(jwt)) {
          request.event.requestContext.authorizer = jwt;
        } else {
          throw createHttpError(401, JSON.stringify({ message: 'Unauthorised' }), {
            type: `Missing permissions to hit the API. Provided info: header = '${JSON.stringify(jwt.header)}' payload = '${JSON.stringify(jwt.payload)}'`
          });
        }
      },
      (err) => {
        throw createHttpError(401, JSON.stringify({ message: 'Unauthorised' }), {
          type: `Invalid Signature. Error: ${JSON.stringify(err)}`
        });
      }
    );
  } else {
    throw createHttpError(401, JSON.stringify({ message: 'Unauthorised' }), {
      type: 'Missing Authorization'
    });
  }
}

export function checkClaims(jwt: StructuredJwt): boolean {
  return ((jwt.payload as JwtPayload)['role'] as string) === 'user';
}
