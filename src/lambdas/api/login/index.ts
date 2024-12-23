import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { verifyGoogleIdentity } from '@services/google-oauth';
import { LoginConfig, readLoginConfig } from './config';
import { buildJwt } from '@services/jwt';
import { baseMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { z } from 'zod';
import { ParsedResult } from '@aws-lambda-powertools/parser/types';
import type { Jwt } from '@own-types/model';
import middy from '@middy/core';
import { signInOrUpUser } from '@services/login';
import { User } from '@model/User';
import { httpRequestPayloadParserMiddleware } from '@common/parser-http-middleware';

const tokenIdReqFieldName = 'google-code';
const loginRequestEventSchema = z.object({
  [tokenIdReqFieldName]: z.string()
});
type Payload = z.infer<typeof loginRequestEventSchema>;
export { loginRequestEventSchema, type Payload };

async function lambdaHandler(
  event: Payload,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  let config: LoginConfig;
  try {
    config = readLoginConfig();
  } catch (e) {
    return internalErrorHandler(e);
  }
  return verifyGoogleIdentity(event[tokenIdReqFieldName], config.googleOAuthClient)
    .then((email) =>
      signInOrUpUser(email, config.userProvider, config.awsConfig)
        .then((user) => buildJwt(jwtPayload(user), user.UserId, config.jwt))
        .then(authenticationSuccessHandler)
        .catch(internalErrorHandler)
    )
    .catch(authenticationFailureHandler);
}

export const handler: middy.MiddyfiedHandler<
  ParsedResult<APIGatewayProxyEventV2, Payload>,
  APIGatewayProxyStructuredResultV2,
  Error,
  Context
> = baseMiddleware()
  .use(httpRequestPayloadParserMiddleware(loginRequestEventSchema))
  .handler(lambdaHandler);

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
