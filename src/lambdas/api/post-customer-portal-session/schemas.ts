import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { customerPortalFlowTypeSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import type { PostCustomerPortalSessionConfig } from './config';

const createCustomerPortalSessionSchema = z
  .object({
    flowType: customerPortalFlowTypeSchema.optional()
  })
  .optional();

export const eventSchema = authedEventSchema<PostCustomerPortalSessionConfig>().extend({
  body: JSONStringified(createCustomerPortalSessionSchema)
});
export type Event = z.infer<typeof eventSchema>;
