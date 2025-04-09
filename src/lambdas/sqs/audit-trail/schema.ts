import { baseEventSchema, baseSystemEventSchema } from '@model/app-events/BaseEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import { z } from 'zod';
import type { AuditTrailConfig } from './config';

const schemas = z.union([baseEventSchema, baseSystemEventSchema]);
export const eventSchema = eventSqsSchema<AuditTrailConfig, typeof schemas>(schemas);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;
