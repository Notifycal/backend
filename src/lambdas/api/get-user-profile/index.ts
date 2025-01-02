import type { APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { type GetUserProfileConfig, readGetUserConfig } from './config';
import { UserBaseStore } from '@services/user-base-store';
import type { AuthedAndConfigRequestContext } from '@model/ApiGatewayEvents';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { APIGatewayProxyEventV2Schema } from '@aws-lambda-powertools/parser/schemas';
import { z } from 'zod';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';

const eventSchema = APIGatewayProxyEventV2Schema.extend({
  requestContext: z.custom<AuthedAndConfigRequestContext<GetUserProfileConfig>>()
});
type Event = z.infer<typeof eventSchema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  const config = event.requestContext.config;
  const userProvider = new UserBaseStore(config.userBaseStore, config.awsConfig);
  const email = event.requestContext.authorizer.payload.email;
  return userProvider.getUserByEmail(email).then((userOrNot) => {
    if (userOrNot) {
      return successHandler()(userOrNot);
    } else {
      return errorHandler(404)('The user could not be found in storage');
    }
  }, errorHandler(500));
}

export const handler = protectedEndpointMiddleware(() => readGetUserConfig(), eventSchema).handler(lambdaHandler);
