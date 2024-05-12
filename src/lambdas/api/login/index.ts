import {
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  Context
} from 'aws-lambda';
import { verifyGoogleToken } from 'services/google-oauth';
import { readLoginConfig } from './config';
import { buildJwt } from 'services/jwt';
import { apply } from 'common/lambda-middleware';
import { logger } from '@powertools';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import { z } from 'zod';
import { APIGatewayProxyEventV2Schema } from '@aws-lambda-powertools/parser/schemas';
import { ApiGatewayV2Envelope } from '@aws-lambda-powertools/parser/envelopes';

const tokenIdReqFieldName = 'google-id-token';
const loginRequestEventSchema = APIGatewayProxyEventV2Schema.extend({
  [tokenIdReqFieldName]: z.string()
});
type Payload = z.infer<typeof loginRequestEventSchema>;

const lambdaHandler: APIGatewayProxyHandler = async (
  event: Payload,
  ctx: Context
): Promise<APIGatewayProxyResult> => {
  const config = readLoginConfig();
  console.log(event)
  return verifyGoogleToken(event[tokenIdReqFieldName], config.googleClientId)
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
};

export const handler = apply(lambdaHandler).use(parser({ schema: loginRequestEventSchema, envelope: ApiGatewayV2Envelope }));

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