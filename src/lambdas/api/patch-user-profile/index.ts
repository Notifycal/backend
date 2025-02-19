import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { reminderConfigSchema } from '@notifycal/shared/schemas';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';
import { UserBaseStore } from '@services/stores/user-base-store';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import type { z } from 'zod';
import { type PatchUserProfileConfig, readPatchUserConfig } from './config';

const eventSchema = authedEventSchema<PatchUserProfileConfig>().extend({
  body: JSONStringified(reminderConfigSchema)
});
export type Event = z.infer<typeof eventSchema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.lambdaConfig;
  const body = event.body;
  const userProvider = UserBaseStore.withConfig(config.userBaseStoreConfig);
  const userId = event.requestContext.authorizer.payload.userId;
  const reminderConfig = {
    businessName: body.businessName,
    businessAddress: body.businessAddress,
    calendars: body.calendars,
    templateId: body.templateId
  };
  return userProvider
    .updateUser(userId, 'live', reminderConfig)
    .then(() => successHandler(204)(), errorHandler(500));
}

export const handler = protectedEndpointMiddleware(
  () => readPatchUserConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
