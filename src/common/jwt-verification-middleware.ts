import middy, { MiddlewareObj, Request } from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import createHttpError from 'http-errors';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { decodeAndVerifyJwtSignature } from '@services/jwt';
import { JwtPayload, Jwt as StructuredJwt } from 'jsonwebtoken';
import { JwtClaimChecker } from '@own-types/model';
import { DecodeJwtConfig } from '@model/DecodeJwtConfig';

export function jwtVerificationMiddleware(
  config: DecodeJwtConfig,
  claimChecker: JwtClaimChecker = checkClaims
): MiddlewareObj<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2> {
  const before: middy.MiddlewareFn<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2> = (
    req
  ) => jwtVerification(req, config, claimChecker);
  const onError = httpErrorHandler().onError;
  return {
    before,
    onError
  };
}

function jwtVerification(
  request: Request<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Error, Context>,
  config: DecodeJwtConfig,
  claimChecker: JwtClaimChecker
): Promise<void> {
  const headers = request.event.headers;
  const authorization = headers['Authorization'] || headers['authorization'];
  if (authorization) {
    return decodeAndVerifyJwtSignature(authorization.replace('Bearer ', ''), config).then(
      (jwt) => {
        if (claimChecker(jwt)) {
          return Promise.resolve();
        } else {
          throw createHttpError(401, 'Unauthorised', {
            type: `Missing permissions to hit the API. Provided info: header = '${JSON.stringify(jwt.header)}' payload = '${JSON.stringify(jwt.payload)}'`
          });
        }
      },
      (err) => {
        throw createHttpError(401, 'Unauthorised', {
          type: `Invalid Signature. Error: ${JSON.stringify(err)}`
        });
      }
    );
  } else {
    throw createHttpError(401, 'Unauthorised', {
      type: 'Missing Authorization'
    });
  }
}

export function checkClaims(jwt: StructuredJwt): boolean {
  return ((jwt.payload as JwtPayload)['role'] as string) === 'user';
}
