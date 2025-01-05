import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { verifyGoogleIdentity } from '@services/google-oauth';
import { type LoginConfig, readLoginConfig } from './config';
import { unprotectedEndpointMiddleware } from '@common/lambda-middleware';
import { z } from 'zod';
import { _successHandler, buildJwtsAndStoreRefreshJwt, signInOrUpUser } from '@services/login';
import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { RefreshTokenBaseStore } from '@services/refresh-token-base-store';
import { errorHandler } from '@services/common/api-response-handlers';
import { eventSchema } from '@model/ApiGatewayEvents';

const schema = eventSchema<LoginConfig>().extend({
  version: z.string().optional(),
  routeKey: z.string().optional(),
  rawPath: z.string().optional(),
  rawQueryString: z.string().optional(),
  queryStringParameters: z.record(z.string()).nullable().optional(),
  body: JSONStringified(
    z.object({
      googleCode: z.string()
    })
  )
});
type Event = z.infer<typeof schema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.endpointConfig;
  const store = new RefreshTokenBaseStore(config.refreshTokenBaseStoreConfig);
  return verifyGoogleIdentity(event.body['googleCode'], config.googleOAuthClientConfig)
    .then((email) =>
      signInOrUpUser(email, config.userBaseStoreConfig)
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

export const handler = unprotectedEndpointMiddleware(() => readLoginConfig(), schema).handler(
  lambdaHandler
);
