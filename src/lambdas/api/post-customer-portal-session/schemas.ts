import { authedEventSchema } from '@model/lambda-events/ApiGatewayEvents';
import type { z } from 'zod';
import type { PostCustomerPortalSessionConfig } from './config';

export const eventSchema = authedEventSchema<PostCustomerPortalSessionConfig>();
export type Event = z.infer<typeof eventSchema>;
