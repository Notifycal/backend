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
import { buildJwts, EncodedJwts } from '@services/jwt';
import {
  internalErrorHandler,
  authenticationFailureHandler,
  successHandler
} from '@services/common/api-response-handlers';

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  const config = event.requestContext.config;
  return verifyGoogleIdentity(event.body['google-code'], config.googleOAuthClient)
    .then((email) =>
      signInOrUpUser(email, config.userBaseStore, config.awsConfig)
        .then((user) =>
          buildJwts(user.UserId, config.encodeJwtConfig, config.encodeRefreshJwtConfig)
        )
        .then(_successHandler)
        .catch(internalErrorHandler)
    )
    .catch(authenticationFailureHandler);
}

const eventSchema = APIGatewayProxyEventV2Schema.extend({
  body: JSONStringified(
    z.object({
      'google-code': z.string()
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

export function _successHandler(jwts: EncodedJwts): APIGatewayProxyStructuredResultV2 {
  return successHandler({
    accessToken: jwts.accessToken,
    tokenType: 'Bearer',
    refreshToken: jwts.refreshToken
  });
}
