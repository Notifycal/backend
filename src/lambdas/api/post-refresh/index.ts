import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { unprotectedEndpointMiddleware } from '@common/lambda-middleware';
import { z } from 'zod';
import middy from '@middy/core';
import { APIGatewayProxyEventV2Schema } from '@aws-lambda-powertools/parser/schemas/api-gatewayv2';
import { ConfigRequestContext } from '@model/ApiGatewayEvents';
import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { readRefreshConfig, RefreshConfig } from './config';
import { decodeAndVerifyJwtSignature } from '@services/jwt';
import { RefreshTokenBaseStore } from '@services/refresh-token-base-store';
import { refreshTokenSchema } from '@model/Jwt';
import {
  forbiddenHandler,
  internalErrorHandler,
  unauthorisedHandler
} from '@services/common/api-response-handlers';
import { _successHandler, buildJwtsAndStoreRefreshJwt } from '../post-login';

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  const config = event.requestContext.config;
  const store = new RefreshTokenBaseStore(config.refreshTokenBaseStoreConfig, config.awsConfig);
  return decodeAndVerifyJwtSignature(
    event.body['refresh-token'],
    refreshTokenSchema,
    config.decodeRefreshJwtConfig
  )
    .then((jwt) => {
      return store
        .getTokenBy(jwt.payload.sub, jwt.payload.jti)
        .then((storedToken) => {
          if (storedToken && storedToken.RefreshToken === event.body['refresh-token']) {
            return buildJwtsAndStoreRefreshJwt(
              storedToken.UserId,
              config.encodeAccessJwtConfig,
              config.encodeRefreshJwtConfig,
              store
            )
              .then(_successHandler)
              .catch(internalErrorHandler);
          } else {
            return forbiddenHandler(
              'The stored refresh token does not match with refresh token provided'
            );
          }
        })
        .catch(internalErrorHandler);
    })
    .catch(unauthorisedHandler);
}

const eventSchema = APIGatewayProxyEventV2Schema.extend({
  body: JSONStringified(
    z.object({
      'refresh-token': z.string()
    })
  ),
  requestContext: z.custom<ConfigRequestContext<RefreshConfig>>()
});
type Event = z.infer<typeof eventSchema>;

export const handler: middy.MiddyfiedHandler<
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Error,
  Context
> = unprotectedEndpointMiddleware(() => readRefreshConfig(), eventSchema).handler(lambdaHandler);
