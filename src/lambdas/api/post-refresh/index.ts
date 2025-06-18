import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { unprotectedCrossDomainEndpointMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { refreshTokenSchema } from '@model/Jwt';
import { apiEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { extractIdentity } from '@model/UserIdentity';
import type { Jwt } from '@notifycal/shared/types';
import { _successHandler, buildJwtsAndStoreRefreshJwt } from '@services/auth';
import { errorHandler } from '@services/common/api-response-handlers';
import { decodeAndVerifyJwtSignature } from '@services/jwt';
import { RefreshTokenBaseStore } from '@services/stores/refresh-token-base-store';
import { UserBaseStore } from '@services/stores/user-base-store';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { type RefreshConfig, readRefreshConfig } from './config';

const schema = apiEventSchema<RefreshConfig>().extend({
  body: JSONStringified(
    z.object({
      refreshToken: z.string().transform((data) => data as Jwt)
    })
  )
});
export type Event = z.infer<typeof schema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  logger.info('Lambda API event', { event });
  const config = event.lambdaConfig;
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
      logger.appendKeys({
        userId
      });
      return Promise.all([
        refreshTokenStore.getTokenBy(userId, jwt.payload.jti),
        userStore.getUserById(userId)
      ])
        .then(([storedToken, user]) => {
          if (storedToken && storedToken.RefreshToken === refreshToken && user) {
            logger.appendKeys({
              idp: user.Idp,
              idpId: user.IdpId
            });
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

const handler = unprotectedCrossDomainEndpointMiddleware(
  () => readRefreshConfig(),
  schema
).handler<Event>(lambdaHandler);

module.exports = { handler };
