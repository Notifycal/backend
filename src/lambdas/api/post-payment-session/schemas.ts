import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { languageCodeSchema, tierIds, topupIds } from '@notifycal/shared/schemas';
import { z } from 'zod';
import type { PostPaymentCheckoutSessionConfig } from './config';

const languagePartialSchema = {
  language: languageCodeSchema
};

const tierIdSchemas = tierIds.map((tier) => z.literal(tier));
const tierCheckoutSessionSchema = z.object({
  tier: z.union([tierIdSchemas[0], tierIdSchemas[1], ...tierIdSchemas.slice(2)]),
  ...languagePartialSchema
});
const topupCheckoutSessionSchema = z.object({
  topup: z.literal(topupIds[0]),
  ...languagePartialSchema
});
export const createCheckoutSessionSchema = z.union([
  tierCheckoutSessionSchema,
  topupCheckoutSessionSchema
]);

export const eventSchema = authedEventSchema<PostPaymentCheckoutSessionConfig>().extend({
  body: JSONStringified(createCheckoutSessionSchema)
});
export type Event = z.infer<typeof eventSchema>;
