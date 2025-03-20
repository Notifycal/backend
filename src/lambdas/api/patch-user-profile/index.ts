import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { reminderConfigSchema } from '@notifycal/shared/schemas';
import { errorHandler, successHandler } from '@services/common/api-response-handlers';
import { UserBaseStore } from '@services/stores/user-base-store';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { type CountryCode, isValidPhoneNumber } from 'libphonenumber-js';
import { match, P } from 'ts-pattern';
import { z } from 'zod';
import { type PatchUserProfileConfig, readPatchUserConfig } from './config';

const contactDetailsWithValidator =
  reminderConfigSchema.shape.business.shape.contactDetails.superRefine((data, context) => {
    match(data)
      .with({ type: 'rcs' }, () => {})
      .with({ type: 'phone', countryCode: P.any, phoneNumber: P.string }, (phone) => {
        if (!isValidPhoneNumber(phone.phoneNumber, phone.countryCode as CountryCode)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Phone number is invalid'
          });
        }
        if (!['ES', 'EN'].includes(phone.countryCode)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'The only dial codes allowed, for now, are from Spain and United Kingdom'
          });
        }
      })
      .exhaustive();
  });

const updatedBusinessSchema = reminderConfigSchema.shape.business.extend({
  contactDetails: contactDetailsWithValidator
});
const bodySchema = reminderConfigSchema.extend({
  business: updatedBusinessSchema
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
  const reminderConfigStoreRecord = {
    business: body.business,
    calendars: body.calendars
  };
  return userProvider
    .updateUser(userId, 'live', reminderConfigStoreRecord)
    .then(() => successHandler(204)(), errorHandler(500));
}

export const handler = protectedEndpointMiddleware(
  () => readPatchUserConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
