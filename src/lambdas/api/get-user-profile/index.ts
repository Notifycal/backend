import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { type GetUserProfileConfig, readGetUserConfig } from './config';
import { UserBaseStore } from '@services/user-base-store';
import { authedEventSchema } from '@model/ApiGatewayEvents';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import type { z } from 'zod';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';

const eventSchema = authedEventSchema<GetUserProfileConfig>();
export type Event = z.infer<typeof eventSchema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.endpointConfig;
  const userProvider = new UserBaseStore(config.userBaseStore);
  const userId = event.requestContext.authorizer.payload.userId;
  return userProvider.getUserById(userId).then((userOrNot) => {
    if (userOrNot) {
      return successHandler()(userOrNot);
    } else {
      return errorHandler(404)('The user could not be found in storage');
    }
  }, errorHandler(500));
}

export const handler = protectedEndpointMiddleware(
  () => readGetUserConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
