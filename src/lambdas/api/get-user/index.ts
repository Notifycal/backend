import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import middy from '@middy/core';
import { GetUserConfig, readGetUserConfig } from './config';
import { UserBaseStore } from '@services/user-base-store';
import { AuthedAndConfigRequestContext } from '@model/ApiGatewayEvents';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { APIGatewayProxyEventV2Schema } from '@aws-lambda-powertools/parser/schemas';
import { z } from 'zod';

async function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  const config = event.requestContext.config;
  const userProvider = new UserBaseStore(config.userBaseStore, config.awsConfig);
  const email = event.requestContext.authorizer.email;
  if (email) {
    return userProvider.getUserByEmail(email).then((user) => {
      return {
        statusCode: 200,
        body: JSON.stringify(user)
      };
    });
  } else {
    return {
      statusCode: 400,
      body: 'Bad Request'
    };
  }
}

const eventSchema = APIGatewayProxyEventV2Schema.extend({
  requestContext: z.custom<AuthedAndConfigRequestContext<GetUserConfig>>()
});
type Event = z.infer<typeof eventSchema>;

export const handler: middy.MiddyfiedHandler<
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Error,
  Context
> = protectedEndpointMiddleware(() => readGetUserConfig(), eventSchema).handler(lambdaHandler);
