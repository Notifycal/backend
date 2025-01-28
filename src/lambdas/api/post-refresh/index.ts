import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { unprotectedEndpointMiddleware } from '@common/lambda-middleware';
import { z } from 'zod';
import { eventSchema } from '@model/ApiGatewayEvents';
import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { type RefreshConfig, readRefreshConfig } from './config';
import { decodeAndVerifyJwtSignature } from '@services/jwt';
import { RefreshTokenBaseStore } from '@services/refresh-token-base-store';
import { refreshTokenSchema } from '@model/Jwt';
import { errorHandler } from '@services/common/api-response-handlers';
import { buildJwtsAndStoreRefreshJwt, _successHandler } from '@services/login';
import type { Jwt } from '@own-types/model';
import { UserBaseStore } from '@services/user-base-store';
import { extractIdentity } from '@model/UserStoreRecord';

const schema = eventSchema<RefreshConfig>().extend({
  body: JSONStringified(
    z.object({
      refreshToken: z.string().transform((v) => v as Jwt)
    })
  )
});
export type Event = z.infer<typeof schema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.endpointConfig;
  const refreshTokenStore = new RefreshTokenBaseStore(config.refreshTokenBaseStoreConfig);
  const userStore = UserBaseStore.withConfig(config.userBaseStoreConfig);
  const refreshToken = event.body['refreshToken'];
  return decodeAndVerifyJwtSignature(
    refreshToken,
    refreshTokenSchema,
    config.decodeRefreshJwtConfig
  )
    .then((jwt) => {
      const userId = jwt.payload.sub;
      return Promise.all([
        refreshTokenStore.getTokenBy(userId, jwt.payload.jti),
        userStore.getUserById(userId)
      ])
        .then(([storedToken, user]) => {
          if (storedToken && storedToken.RefreshToken === refreshToken && user) {
            return buildJwtsAndStoreRefreshJwt(
              extractIdentity(user),
              config.encodeAccessJwtConfig,
              config.encodeRefreshJwtConfig,
              refreshTokenStore
            )
              .then(_successHandler)
              .catch(errorHandler(500));
          } else {
            return errorHandler(403)(
              'Either user and/or refresh token is in persistance or stored refresh token does not match with refresh token provided'
            );
          }
        })
        .catch(errorHandler(500));
    })
    .catch(errorHandler(401));
}

export const handler = unprotectedEndpointMiddleware(
  () => readRefreshConfig(),
  schema
).handler<Event>(lambdaHandler);
