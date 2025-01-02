import { AuthedEventWithConfig } from '../model/ApiGatewayEvents';
import middy, { MiddlewareObj, Request } from '@middy/core';
import { APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { decodeAndVerifyJwtSignature } from '@services/jwt';
import { JwtClaimCheckerFn } from '@own-types/model';
import { AuthedEndpointConfig } from '@model/Config';
import { AccessToken, accessTokenSchema } from '@model/Jwt';
import { errorHandler } from '@services/common/api-response-handlers';

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
      (err) => {
        return errorHandler(401)(`Invalid Signature. Error: ${JSON.stringify(err)}`);
      }
    );
  } else {
    return Promise.resolve(errorHandler(401)('Missing Authorization'));
  }
}

export function checkClaims(jwt: AccessToken): boolean {
  return jwt.payload.role === 'user';
}
