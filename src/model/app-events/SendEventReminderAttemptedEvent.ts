import { calendarEventSchema, calendarSchema, uuidSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { runSchema, receiverSchema, senderSchema } from './common';

const dataSchema = z.object({
  run: runSchema,
  calendar: calendarSchema,
  calendarEvent: calendarEventSchema,
  receiverDetails: receiverSchema,
  senderDetails: senderSchema,
  message: z.string(),
  messageUUID: uuidSchema
});

export const sendEventReminderAttemptedEventSchema = eventSchemaGenerator(
  'ActionableEventFound',
  dataSchema,
  z.object({}).strict()
);

export type SendEventReminderAttemptedEvent = z.infer<typeof sendEventReminderAttemptedEventSchema>;
