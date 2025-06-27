import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { tierIdMap, topupIdMap } from '@model/PaymentPlans';
import { languageCodeSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import type { PostPaymentCheckoutSessionConfig } from './config';

const languagePartialSchema = {
  language: languageCodeSchema
};

const tierIdSchemas = Object.values(tierIdMap).map((tier) => z.literal(tier));
const tierCheckoutSessionSchema = z.object({
  tier: z.union([tierIdSchemas[0], tierIdSchemas[1], ...tierIdSchemas.slice(2)]),
  ...languagePartialSchema
});
const topupCheckoutSessionSchema = z.object({
  topup: z.literal(topupIdMap.single),
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
