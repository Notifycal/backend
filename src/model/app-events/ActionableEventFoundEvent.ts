import { calendarEventSchema, calendarSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { phoneE164Schema, runSchema, senderSchema } from './common';

const dataSchema = z.object({
  run: runSchema,
  calendar: calendarSchema,
  calendarEvent: calendarEventSchema,
  receiverDetails: phoneE164Schema,
  senderDetails: senderSchema,
  message: z.string()
});
export const actionableEventFoundEventSchema = eventSchemaGenerator(
  'ActionableEventFound',
  dataSchema
);

export type ActionableEventFoundEvent = z.infer<typeof actionableEventFoundEventSchema>;
