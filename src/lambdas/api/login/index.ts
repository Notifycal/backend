import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { verifyGoogleIdentity } from '@services/google-oauth';
import { LoginConfig, readLoginConfig } from './config';
import { buildJwt } from '@services/jwt';
import { applyMiddleware, handleInputValidation } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import { z } from 'zod';
import { ApiGatewayV2Envelope } from '@aws-lambda-powertools/parser/envelopes';
import { ParsedResult } from '@aws-lambda-powertools/parser/types';
import type { Jwt } from '@own-types/model';
import middy from '@middy/core';
import { signInOrUpUser } from '@services/login';

const tokenIdReqFieldName = 'google-code';
const loginRequestEventSchema = z.object({
  [tokenIdReqFieldName]: z.string()
});
type Payload = z.infer<typeof loginRequestEventSchema>;
export { loginRequestEventSchema, type Payload };

async function lambdaHandler(
  event: ParsedResult<APIGatewayProxyEventV2, Payload>,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  let config: LoginConfig;
  try {
    config = readLoginConfig();
  } catch (e) {
    return internalErrorHandler(e);
  }
  return handleInputValidation<Payload>(event)
    .then((event) =>
      verifyGoogleIdentity(event[tokenIdReqFieldName], config.googleOAuthClient)
        .then((email) =>
          signInOrUpUser(email, config.userProvider, config.awsConfig)
            .then((user) => buildJwt(user, config.privateKey, config.jwt))
            .then(authenticationSuccessHandler)
            .catch(internalErrorHandler)
        )
        .catch(authenticationFailureHandler)
    )
    .catch(badRequestHandler);
}

export const handler: middy.MiddyfiedHandler<
  ParsedResult<APIGatewayProxyEventV2, Payload>,
  APIGatewayProxyStructuredResultV2,
  Error,
  Context
> = applyMiddleware<Payload>(lambdaHandler).use(
  parser({ schema: loginRequestEventSchema, envelope: ApiGatewayV2Envelope, safeParse: true })
);

function authenticationSuccessHandler(jwt: Jwt): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 200,
    body: JSON.stringify({
      accessToken: jwt,
      tokenType: 'Bearer',
      refreshToken: 'WIP'
    }),
    // This is just an example, need to refine it and make it more secure.
    cookies: ['refreshToken=myRefreshToken; Max-Age=2592000; SameSite=None']
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
function badRequestHandler(reason: any): APIGatewayProxyStructuredResultV2 {
  logger.warn(reason);
  return {
    statusCode: 400,
    body: JSON.stringify({ message: 'Bad Request' })
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
