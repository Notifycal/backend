import { calendarEventSchema, calendarSchema, uuidSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { runSchema, receiverSchema, senderSchema } from './common';
import { VonageMessageStatusWebhookSchema } from '@model/vendor/vonage';

const dataSchema = z.object({
  run: runSchema,
  calendar: calendarSchema,
  calendarEvent: calendarEventSchema,
  receiverDetails: receiverSchema,
  senderDetails: senderSchema,
  message: z.string(),
  messageUUID: uuidSchema,
  messageStatusPayload: VonageMessageStatusWebhookSchema
});

export const calendarEventReminderStatusUpdatedEventSchema = eventSchemaGenerator(
  'CalendarEventReminderStatusUpdated',
  dataSchema
);

export type CalendarEventReminderStatusUpdatedEvent = z.infer<
  typeof calendarEventReminderStatusUpdatedEventSchema
>;
