import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import middy from '@middy/core';
import { GetUserProfileConfig, readGetUserConfig } from './config';
import { UserBaseStore } from '@services/user-base-store';
import { AuthedAndConfigRequestContext } from '@model/ApiGatewayEvents';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { APIGatewayProxyEventV2Schema } from '@aws-lambda-powertools/parser/schemas';
import { z } from 'zod';
import {
  internalErrorHandler,
  notFoundHandler,
  successHandler
} from '@services/common/api-response-handlers';

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  const config = event.requestContext.config;
  const userProvider = new UserBaseStore(config.userBaseStore, config.awsConfig);
  const email = event.requestContext.authorizer.payload.email;
  return userProvider.getUserByEmail(email).then((userOrNot) => {
    if (userOrNot) {
      return successHandler(userOrNot);
    } else {
      return notFoundHandler('The user could not be found in storage');
    }
  }, internalErrorHandler);
}

const eventSchema = APIGatewayProxyEventV2Schema.extend({
  requestContext: z.custom<AuthedAndConfigRequestContext<GetUserProfileConfig>>()
});
type Event = z.infer<typeof eventSchema>;

export const handler: middy.MiddyfiedHandler<
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Error,
  Context
> = protectedEndpointMiddleware(() => readGetUserConfig(), eventSchema).handler(lambdaHandler);
