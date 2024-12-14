import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { verifyGoogleToken } from 'services/google-oauth';
import { LoginConfig, readLoginConfig } from './config';
import { buildJwt } from 'services/jwt';
import { apply, handleInputValidation } from 'common/lambda-middleware';
import { logger } from '@powertools';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import { z } from 'zod';
import { ApiGatewayV2Envelope } from '@aws-lambda-powertools/parser/envelopes';
import { ParsedResult } from '@aws-lambda-powertools/parser/types';
import { UserProvider, UserProviderConfig } from 'services/users-provider';
import { User } from 'model/User';
import { Jwt } from 'types/model';

const tokenIdReqFieldName = 'google-id-token';
const loginRequestEventSchema = z.object({
  [tokenIdReqFieldName]: z.string()
});
type Payload = z.infer<typeof loginRequestEventSchema>;
export { loginRequestEventSchema, type Payload };

async function lambdaHandler(
  event: ParsedResult<APIGatewayProxyEventV2, Payload>,
  ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  let config: LoginConfig;
  try {
    config = readLoginConfig();
  } catch (e) {
    return internalErrorHandler(e);
  }
  return handleInputValidation<Payload>(event)
    .then((event) => verifyGoogleToken(event[tokenIdReqFieldName], config.googleClientId))
    .then((email) => signInOrUpUser(email, config.userProvider))
    .then((user) =>
      buildJwt(user, config.privateKey, config.jwt).then(
        authenticationSuccessHandler,
        internalErrorHandler
      )
    )
    .catch(authenticationFailureHandler);
}

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

function internalErrorHandler(error: any): APIGatewayProxyStructuredResultV2 {
  logger.error(error);
  return {
    statusCode: 500,
    body: 'KO'
  };
}

function authenticationFailureHandler(reason: any): APIGatewayProxyStructuredResultV2 {
  logger.warn(reason);
  return {
    statusCode: 401,
    body: 'Unauthorised'
  };
}

export const handler = apply(lambdaHandler).use(
  parser({ schema: loginRequestEventSchema, envelope: ApiGatewayV2Envelope, safeParse: true })
);

function signInOrUpUser(email: string, config: UserProviderConfig): Promise<User> {
  const userProvider = new UserProvider(config);
  return userProvider
    .getUserByEmail(email)
    .then((user) => user)
    .catch((_) => {
      const newUser = { UserId: email } as User;
      return userProvider.putUser(newUser).then((_) => newUser);
    });
}
