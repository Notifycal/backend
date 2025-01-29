import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { authedEventSchema } from '@model/ApiGatewayEvents';
import { calendarSchema } from '@model/Calendar';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';
import { UserBaseStore } from '@services/user-base-store';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { type PatchUserProfileConfig, readPatchUserConfig } from './config';

export const bodySchema = z.object({
  userStatus: z.literal('live'),
  calendars: z.array(calendarSchema).min(1),
  businessName: z.string().min(1).brand('BusinessName'),
  businessAddress: z.string().min(1).brand('BusinessAddress')
});
export type BodyPayload = z.infer<typeof bodySchema>;
const eventSchema = authedEventSchema<PatchUserProfileConfig>().extend({
  body: JSONStringified(bodySchema)
});
export type Event = z.infer<typeof eventSchema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): Promise<APIGatewayProxyResult> {
  const config = event.endpointConfig;
  const body = event.body;
  const userProvider = UserBaseStore.withConfig(config.userBaseStoreConfig);
  const userId = event.requestContext.authorizer.payload.userId;
  const reminderConfig = {
    businessName: body.businessName,
    businessAddress: body.businessAddress,
    calendars: body.calendars
  };
  return userProvider
    .updateUser(userId, body.userStatus, reminderConfig)
    .then(() => successHandler(204)(), errorHandler(500));
}

export const handler = protectedEndpointMiddleware(
  () => readPatchUserConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
