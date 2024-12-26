import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { unprotectedEndpointMiddleware } from '@common/lambda-middleware';
import { z } from 'zod';
import middy from '@middy/core';
import { APIGatewayProxyEventV2Schema } from '@aws-lambda-powertools/parser/schemas/api-gatewayv2';
import { ConfigRequestContext } from '@model/ApiGatewayEvents';
import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { readRenewConfig, RenewConfig } from './config';
import { buildJwts, decodeAndVerifyJwtSignature, decodeJwt } from '@services/jwt';
import { RefreshTokenBaseStore } from '@services/refresh-token-base-store';
import { RefreshToken } from '@model/Jwt';
import { forbiddenHandler } from '@services/common/api-response-handlers';
import { _successHandler } from '../post-login';

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  const config = event.requestContext.config;
  const store = new RefreshTokenBaseStore(config.refreshTokenBaseStoreConfig, config.awsConfig);
  return decodeAndVerifyJwtSignature<RefreshToken>(
    event.body['refresh-token'],
    config.decodeRefreshJwtConfig
  )
    .then((jwt) => {
      return store.getTokenBy(jwt.payload.sub, jwt.payload.jti);
    })
    .then((storedToken) => {
      if (storedToken.RefreshToken === event.body['refresh-token']) {
        return buildJwts(storedToken.UserId, config.encodeJwtConfig, config.encodeRefreshJwtConfig)
          .then((jwts) => {
            return decodeJwt<RefreshToken>(jwts.refreshToken)
              .then((refreshTokenDecoded) =>
                store.putToken({
                  UserId: refreshTokenDecoded.payload.sub,
                  RefreshToken: jwts.refreshToken,
                  RefreshTokenId: refreshTokenDecoded.payload.jti,
                  ExpiresAt: refreshTokenDecoded.payload.exp + 1 // +1 just in case...
                })
              )
              .then(() => jwts);
          })
          .then(_successHandler);
      } else {
        return forbiddenHandler(
          'The stored refresh token does not match with refresh token provided'
        );
      }
    });
}

const eventSchema = APIGatewayProxyEventV2Schema.extend({
  body: JSONStringified(
    z.object({
      'refresh-token': z.string()
    })
  ),
  requestContext: z.custom<ConfigRequestContext<RenewConfig>>()
});
type Event = z.infer<typeof eventSchema>;

export const handler: middy.MiddyfiedHandler<
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Error,
  Context
> = unprotectedEndpointMiddleware(() => readRenewConfig(), eventSchema).handler(lambdaHandler);
