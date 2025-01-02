import type { APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { unprotectedEndpointMiddleware } from '@common/lambda-middleware';
import { z } from 'zod';
import { APIGatewayProxyEventV2Schema } from '@aws-lambda-powertools/parser/schemas/api-gatewayv2';
import type { ConfigRequestContext } from '@model/ApiGatewayEvents';
import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { type RefreshConfig, readRefreshConfig } from './config';
import { decodeAndVerifyJwtSignature } from '@services/jwt';
import { RefreshTokenBaseStore } from '@services/refresh-token-base-store';
import { refreshTokenSchema } from '@model/Jwt';
import { errorHandler } from '@services/common/api-response-handlers';
import { buildJwtsAndStoreRefreshJwt, _successHandler } from '@services/login';

const eventSchema = APIGatewayProxyEventV2Schema.extend({
  body: JSONStringified(
    z.object({
      refreshToken: z.string()
    })
  ),
  requestContext: z.custom<ConfigRequestContext<RefreshConfig>>()
});
type Event = z.infer<typeof eventSchema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  const config = event.requestContext.config;
  const store = new RefreshTokenBaseStore(config.refreshTokenBaseStoreConfig, config.awsConfig);
  const refreshToken = event.body['refreshToken'];
  return decodeAndVerifyJwtSignature(
    refreshToken,
    refreshTokenSchema,
    config.decodeRefreshJwtConfig
  )
    .then((jwt) => {
      return store
        .getTokenBy(jwt.payload.sub, jwt.payload.jti)
        .then((storedToken) => {
          if (storedToken && storedToken.RefreshToken === refreshToken) {
            return buildJwtsAndStoreRefreshJwt(
              storedToken.UserId,
              config.encodeAccessJwtConfig,
              config.encodeRefreshJwtConfig,
              store
            )
              .then(_successHandler)
              .catch(errorHandler(500));
          } else {
            return errorHandler(403)(
              'The stored refresh token does not match with refresh token provided'
            );
          }
        })
        .catch(errorHandler(500));
    })
    .catch(errorHandler(401));
}

export const handler = unprotectedEndpointMiddleware(
  () => readRefreshConfig(),
  eventSchema
).handler(lambdaHandler);
