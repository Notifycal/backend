import { calendarEventSchema, calendarSchema } from '@notifycal/shared/schemas';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { runSchema } from './common';
import { baseMessagingEventDataSchema } from './messaging-common';

const dataSchema = baseMessagingEventDataSchema.extend({
  run: runSchema,
  calendar: calendarSchema,
  calendarEvent: calendarEventSchema
});
export const actionableEventFoundEventSchema = eventSchemaGenerator(
  'ActionableEventFound',
  dataSchema
);

export type ActionableEventFoundEvent = z.infer<typeof actionableEventFoundEventSchema>;
