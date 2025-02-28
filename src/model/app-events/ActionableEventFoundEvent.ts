import {
  calendarEventSchema,
  calendarSchema,
  contactSchema,
  phoneContactSchema
} from '@notifycal/shared/schemas';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { runSchema } from './common';

const dataSchema = z.object({
  run: runSchema,
  calendar: calendarSchema,
  calendarEvent: calendarEventSchema,
  receiverDetails: phoneContactSchema,
  senderDetails: contactSchema,
  message: z.string()
});
export const actionableEventFoundEventSchema = eventSchemaGenerator(
  'ActionableEventFound',
  dataSchema
);

export type ActionableEventFoundEvent = z.infer<typeof actionableEventFoundEventSchema>;
