import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context
} from 'aws-lambda';
import { verifyGoogleToken } from 'services/google-oauth';
import { readLoginConfig } from './config';
import { buildJwt } from 'services/jwt';
import { apply, handleInputValidation } from 'common/lambda-middleware';
import { logger } from '@powertools';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import { z } from 'zod';
import { ApiGatewayEnvelope } from '@aws-lambda-powertools/parser/envelopes';
import { ParsedResult } from '@aws-lambda-powertools/parser/types';

const tokenIdReqFieldName = 'google-id-token';
const loginRequestEventSchema = z.object({
  [tokenIdReqFieldName]: z.string()
});
type Payload = z.infer<typeof loginRequestEventSchema>;

async function lambdaHandler(event: ParsedResult<APIGatewayProxyEvent, Payload>,
  ctx: Context): Promise<APIGatewayProxyResult> {
  const config = readLoginConfig();
  return handleInputValidation<Payload>(event)
    .then(event => verifyGoogleToken(event[tokenIdReqFieldName], config.googleClientId))
    .then(email => lookupUser(email))
    .then(user => buildJwt(user, config.privateKey, config.jwt))
    .then(jwt => {
      return {
        statusCode: 200,
        headers: {
          'Set-Authorization': jwt,
          'Set-Refresh-Token': 'WIP'
        },
        body: ''
      };
    })
    .catch(err => {
      onError(err);
      return {
        statusCode: 401,
        body: ''
      };
    });
}

export const handler = apply(lambdaHandler).use(parser({ schema: loginRequestEventSchema, envelope: ApiGatewayEnvelope, safeParse: true }));

function lookupUser(email: string): Promise<User> {
  const notifycalDB = ['notifycal@gmail.com'];
  if (notifycalDB.includes(email)) return Promise.resolve({ email: email });
  else {
    // create user in Notifycal
    return Promise.resolve({ email: email });
  }
}

function onError(err: any): void {
  logger.warn(err);
}