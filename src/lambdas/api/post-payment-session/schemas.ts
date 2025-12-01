import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { freeTrialTierId, languageCodeSchema, tierIds, topupIds } from '@notifycal/shared/schemas';
import { z } from 'zod';
import type { PostPaymentCheckoutSessionConfig } from './config';

const languagePartialSchema = {
  language: languageCodeSchema
};

const _tierIdSchemas = tierIds.map((tier) => z.literal(tier));
export const tierIdSchemas = z.union([
  z.literal(freeTrialTierId),
  _tierIdSchemas[0]!,
  _tierIdSchemas[1]!,
  ..._tierIdSchemas.slice(2)
]);
const tierCheckoutSessionSchema = z.object({
  tier: tierIdSchemas,
  ...languagePartialSchema
});
const topupCheckoutSessionSchema = z.object({
  topup: z.literal(topupIds[0]!),
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
