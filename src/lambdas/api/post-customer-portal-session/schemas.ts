import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import { customerPortalFlowTypeSchema, languageCodeSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import type { PostCustomerPortalSessionConfig } from './config';

const createCustomerPortalSessionSchema = z.object({
  language: languageCodeSchema,
  flowType: customerPortalFlowTypeSchema.optional()
});

export const eventSchema = authedEventSchema<PostCustomerPortalSessionConfig>().extend({
  body: JSONStringified(createCustomerPortalSessionSchema)
});
export type Event = z.infer<typeof eventSchema>;
