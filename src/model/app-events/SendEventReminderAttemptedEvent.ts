import { calendarEventSchema, calendarSchema, uuidSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { baseEventSchema } from './BaseEvent';
import { contactDetailsSchema, runSchema } from './common';

export const sendEventReminderAttempted = baseEventSchema.extend({
  data: z.object({
    run: runSchema,
    calendar: calendarSchema,
    calendarEvent: calendarEventSchema,
    receiverDetails: contactDetailsSchema,
    senderDetails: contactDetailsSchema,
    message: z.string(),
    messageUUID: uuidSchema
  })
});

export type SendEventReminderAttemptedEvent = z.infer<typeof sendEventReminderAttempted>;
