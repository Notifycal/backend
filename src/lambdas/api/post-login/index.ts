import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { verifyGoogleIdentity } from '@services/google-oauth';
import { LoginConfig, readLoginConfig } from './config';
import { buildJwt } from '@services/jwt';
import { unprotectedEndpointMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { z } from 'zod';
import type { Jwt } from '@own-types/model';
import middy from '@middy/core';
import { signInOrUpUser } from '@services/login';
import { User } from '@model/User';
import { APIGatewayProxyEventV2Schema } from '@aws-lambda-powertools/parser/schemas/api-gatewayv2';
import { ConfigRequestContext } from '@model/ApiGatewayEvents';
import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  const config = event.requestContext.config;
  return verifyGoogleIdentity(event.body['google-code'], config.googleOAuthClient)
    .then((email) =>
      signInOrUpUser(email, config.userBaseStore, config.awsConfig)
        .then((user) => buildJwt(jwtPayload(user), user.UserId, config.encodeJwtConfig))
        .then(authenticationSuccessHandler)
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

function jwtPayload(user: User): object {
  return {
    email: user.UserId,
    role: 'user',
    permissions: {}
  };
}

function authenticationSuccessHandler(jwt: Jwt): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 200,
    body: JSON.stringify({
      accessToken: jwt,
      tokenType: 'Bearer',
      refreshToken: 'WIP'
    })
  };
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function authenticationFailureHandler(reason: any): APIGatewayProxyStructuredResultV2 {
  logger.warn(reason);
  return {
    statusCode: 401,
    body: JSON.stringify({ message: 'Unauthorised' })
  };
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function internalErrorHandler(error: any): APIGatewayProxyStructuredResultV2 {
  logger.error(error);
  return {
    statusCode: 500,
    body: JSON.stringify({ message: 'KO' })
  };
}
