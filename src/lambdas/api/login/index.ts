import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context
} from 'aws-lambda';
import { verifyGoogleToken } from 'services/google-oauth';
import { readLoginConfig } from './config';
import { buildJwt } from 'services/jwt';
import { apply, handleInputValidation } from 'common/lambda-middleware';
import { logger } from '@powertools';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import { z } from 'zod';
import { ApiGatewayV2Envelope } from '@aws-lambda-powertools/parser/envelopes';
import { ParsedResult } from '@aws-lambda-powertools/parser/types';

const tokenIdReqFieldName = 'google-id-token';
const loginRequestEventSchema = z.object({
  [tokenIdReqFieldName]: z.string()
});
type Payload = z.infer<typeof loginRequestEventSchema>;
export { loginRequestEventSchema, type Payload }

async function lambdaHandler(event: ParsedResult<APIGatewayProxyEventV2, Payload>,
  ctx: Context): Promise<APIGatewayProxyStructuredResultV2> {
  const config = readLoginConfig();
  return handleInputValidation<Payload>(event)
    .then(event => verifyGoogleToken(event[tokenIdReqFieldName], config.googleClientId))
    .then(email => lookupUser(email))
    .then(user => buildJwt(user, config.privateKey, config.jwt).then(jwt => {
      return {
        statusCode: 200,
        headers: {
          'Set-Authorization': jwt,
          'Set-Refresh-Token': 'WIP'
        },
        body: 'OK'
      };
    }, internalErrorHandler))
    .catch(authenticationFailureHandler);
}

function internalErrorHandler(error: any) {
  logger.error(error);
  return {
    statusCode: 500,
    body: 'KO'
  };
}

function authenticationFailureHandler(reason: any) {
  logger.warn(reason);
  return {
    statusCode: 401,
    body: 'Unauthorised'
  };
}

export const handler = apply(lambdaHandler).use(parser({ schema: loginRequestEventSchema, envelope: ApiGatewayV2Envelope, safeParse: true }));

function lookupUser(email: string): Promise<User> {
  const notifycalDB = ['notifycal@gmail.com', 'sergio.anger@gmail.com'];
  if (notifycalDB.includes(email)) return Promise.resolve({ email: email });
  else {
    // create user in Notifycal
    return Promise.resolve({ email: email });
  }
}