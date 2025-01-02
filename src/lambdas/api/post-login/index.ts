import type { APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { verifyGoogleIdentity } from '@services/google-oauth';
import { type LoginConfig, readLoginConfig } from './config';
import { unprotectedEndpointMiddleware } from '@common/lambda-middleware';
import { z } from 'zod';
import { _successHandler, buildJwtsAndStoreRefreshJwt, signInOrUpUser } from '@services/login';
import { APIGatewayProxyEventV2Schema } from '@aws-lambda-powertools/parser/schemas/api-gatewayv2';
import type { ConfigRequestContext } from '@model/ApiGatewayEvents';
import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { RefreshTokenBaseStore } from '@services/refresh-token-base-store';
import { errorHandler } from '@services/common/api-response-handlers';

const eventSchema = APIGatewayProxyEventV2Schema.extend({
  body: JSONStringified(
    z.object({
      googleCode: z.string()
    })
  ),
  requestContext: z.custom<ConfigRequestContext<LoginConfig>>()
});
type Event = z.infer<typeof eventSchema>;

function lambdaHandler(
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

export const handler = unprotectedEndpointMiddleware(() => readLoginConfig(), eventSchema).handler(
  lambdaHandler
);
