import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { verifyGoogleToken } from '@services/google-oauth';
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

const tokenIdReqFieldName = 'google-id-token';
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
      verifyGoogleToken(event[tokenIdReqFieldName], config.googleClientId)
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
    headers: {
      'Set-Authorization': jwt,
      'Set-Refresh-Token': 'WIP'
    },
    body: 'OK'
  };
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function authenticationFailureHandler(reason: any): APIGatewayProxyStructuredResultV2 {
  logger.warn(reason);
  return {
    statusCode: 401,
    body: 'Unauthorised'
  };
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function badRequestHandler(reason: any): APIGatewayProxyStructuredResultV2 {
  logger.warn(reason);
  return {
    statusCode: 400,
    body: 'Bad Request'
  };
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function internalErrorHandler(error: any): APIGatewayProxyStructuredResultV2 {
  logger.error(error);
  return {
    statusCode: 500,
    body: 'KO'
  };
}
