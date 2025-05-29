import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { z } from 'zod';
import { tierIdMap, type PostPaymentCheckoutSessionConfig } from './config';

const tierIdSchemas = Object.values(tierIdMap).map((tier) => z.literal(tier));
export const createCheckoutSessionSchema = z.object({
  tier: z.union([tierIdSchemas[0], tierIdSchemas[1], ...tierIdSchemas.slice(2)])
});

export const eventSchema = authedEventSchema<PostPaymentCheckoutSessionConfig>().extend({
  body: JSONStringified(createCheckoutSessionSchema)
});
export type Event = z.infer<typeof eventSchema>;
