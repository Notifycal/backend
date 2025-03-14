import { VonageMessageStatusWebhookSchema } from '@model/vendor/vonage';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { calendarEventReminderAttemptSentEventSchema } from './CalendarEventReminderAttemptSentEvent';

export const calendarEventReminderStatusUpdatedEventSchema = eventSchemaGenerator(
  'CalendarEventReminderStatusUpdated',
  calendarEventReminderAttemptSentEventSchema.shape.data.extend({
    messageStatusPayload: VonageMessageStatusWebhookSchema
  })
);

export type CalendarEventReminderStatusUpdatedEvent = z.infer<
  typeof calendarEventReminderStatusUpdatedEventSchema
>;
