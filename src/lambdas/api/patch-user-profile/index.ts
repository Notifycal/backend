import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { toStoreRecord } from '@model/store/ReminderConfigStoreRecord';
import { type DateTime, reminderConfigSchema } from '@notifycal/shared/types';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';
import { UserBaseStore } from '@services/stores/user-base-store';
import { senderValidator } from '@utils/phone';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { DateTime as DT } from 'luxon';
import { z } from 'zod';
import { type PatchUserProfileConfig, readPatchUserConfig } from './config';

const contactDetailsWithValidator =
  reminderConfigSchema.shape.business.shape.senderContact.superRefine(senderValidator);

const updatedBusinessSchema = reminderConfigSchema.shape.business.extend({
  senderContact: contactDetailsWithValidator
});
const confirmationSchemaOverride = z
  .object({
    termsAccepted: z.literal(true),
    privacyAccepted: z.literal(true),
    marketingOptInAccepted: z.boolean()
  })
  .transform((data) => {
    const now = DT.now().toUTC().toISO() as DateTime;
    return {
      termsAccepted: now,
      privacyAccepted: now,
      marketingOptInAccepted: data.marketingOptInAccepted ? now : undefined
    };
  });
export const bodySchema = reminderConfigSchema.extend({
  business: updatedBusinessSchema,
  confirmation: confirmationSchemaOverride
});

const eventSchema = authedEventSchema<PatchUserProfileConfig>().extend({
  body: JSONStringified(bodySchema)
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
  return userProvider
    .updateUser(userId, 'live', toStoreRecord(body))
    .then(() => successHandler(204)(), errorHandler(500));
}

const handler = protectedEndpointMiddleware(
  () => readPatchUserConfig(),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
