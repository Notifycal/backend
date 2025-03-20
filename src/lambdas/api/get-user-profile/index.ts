import { protectedNotifycalEndpointMiddleware } from '@common/lambda-middleware';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { extractUser } from '@model/store/UserStoreRecord';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';
import { UserBaseStore } from '@services/stores/user-base-store';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import type { z } from 'zod';
import { type GetUserProfileConfig, readGetUserConfig } from './config';

const eventSchema = authedEventSchema<GetUserProfileConfig>();
export type Event = z.infer<typeof eventSchema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.lambdaConfig;
  const userProvider = UserBaseStore.withConfig(config.userBaseStoreConfig);
  const userId = event.requestContext.authorizer.payload.userId;
  return userProvider.getUserById(userId).then((userOrNot) => {
    if (userOrNot) {
      return successHandler()({ result: extractUser(userOrNot) });
    } else {
      return errorHandler(404)('The user could not be found in storage');
    }
  }, errorHandler(500));
}

export const handler = protectedNotifycalEndpointMiddleware(
  () => readGetUserConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
