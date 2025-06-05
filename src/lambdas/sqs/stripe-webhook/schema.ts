import { eventBridgeEventSchema } from '@model/lambda-events/EventBridgeEvents';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { z } from 'zod';
import type { StripeWebhookConfig } from './config';

const bodySchema = eventBridgeEventSchema();

export const eventSchema = eventSqsSchema<StripeWebhookConfig, typeof bodySchema>(bodySchema);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;
