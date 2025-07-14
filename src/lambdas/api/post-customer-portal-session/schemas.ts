import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { z } from 'zod';
import type { PostCustomerPortalSessionConfig } from './config';

const createCustomerPortalSessionSchema = z.object({
  // eslint-disable-next-line camelcase
  flow_type: z.enum(['subscription_cancel', 'subscription_update'])
});

export const eventSchema = authedEventSchema<PostCustomerPortalSessionConfig>().extend({
  body: JSONStringified(createCustomerPortalSessionSchema)
});
export type Event = z.infer<typeof eventSchema>;
