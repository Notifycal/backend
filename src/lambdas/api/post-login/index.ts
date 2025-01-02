import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { verifyGoogleIdentity } from '@services/google-oauth';
import { LoginConfig, readLoginConfig } from './config';
import { unprotectedEndpointMiddleware } from '@common/lambda-middleware';
import { z } from 'zod';
import middy from '@middy/core';
import { signInOrUpUser } from '@services/login';
import { APIGatewayProxyEventV2Schema } from '@aws-lambda-powertools/parser/schemas/api-gatewayv2';
import { ConfigRequestContext } from '@model/ApiGatewayEvents';
import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { buildJwts, EncodedAndDecodedJwts } from '@services/jwt';
import { RefreshTokenBaseStore } from '@services/refresh-token-base-store';
import { EncodeAccessJwtConfig, EncodeRefreshJwtConfig } from '@model/Config';
import { UserId } from '@own-types/model';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  const config = event.requestContext.config;
  const store = new RefreshTokenBaseStore(config.refreshTokenBaseStoreConfig, config.awsConfig);
  return verifyGoogleIdentity(event.body['googleCode'], config.googleOAuthClientConfig)
    .then((email) =>
      signInOrUpUser(email, config.userBaseStoreConfig, config.awsConfig)
        .then((user) =>
          buildJwtsAndStoreRefreshJwt(
            user.UserId,
            config.encodeAccessJwtConfig,
            config.encodeRefreshJwtConfig,
            store
          )
        )
        .then(_successHandler)
        .catch(errorHandler(500))
    )
    .catch(errorHandler(401));
}

const eventSchema = APIGatewayProxyEventV2Schema.extend({
  body: JSONStringified(
    z.object({
      googleCode: z.string()
    })
  ),
  requestContext: z.custom<ConfigRequestContext<LoginConfig>>()
});
type Event = z.infer<typeof eventSchema>;

export const handler: middy.MiddyfiedHandler<
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Error,
  Context
> = unprotectedEndpointMiddleware(() => readLoginConfig(), eventSchema).handler(lambdaHandler);

export function buildJwtsAndStoreRefreshJwt(
  userId: UserId,
  encodeAccessJwtConfig: EncodeAccessJwtConfig,
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig,
  store: RefreshTokenBaseStore
) {
  return buildJwts(userId, encodeAccessJwtConfig, encodeRefreshJwtConfig).then((jwts) =>
    store
      .putToken({
        UserId: jwts.refreshToken.decoded.payload.sub,
        RefreshToken: jwts.refreshToken.encoded,
        RefreshTokenId: jwts.refreshToken.decoded.payload.jti,
        ExpiresAt: jwts.refreshToken.decoded.payload.exp + 1 // +1 just in case...
      })
      .then(() => jwts)
  );
}

export function _successHandler(jwts: EncodedAndDecodedJwts): APIGatewayProxyStructuredResultV2 {
  return successHandler()({
    accessToken: jwts.accessToken.encoded,
    tokenType: 'Bearer',
    refreshToken: jwts.refreshToken.encoded
  });
}
