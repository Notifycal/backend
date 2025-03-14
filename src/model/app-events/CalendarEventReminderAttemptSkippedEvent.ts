import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { calendarEventReminderAttemptSentEventSchema } from './CalendarEventReminderAttemptSentEvent';

export const calendarEventReminderAttemptSkippedEventSchema = eventSchemaGenerator(
  'CalendarEventReminderAttemptSkipped',
  calendarEventReminderAttemptSentEventSchema.shape.data
);

export type CalendarEventReminderAttemptSkippedEvent = z.infer<
  typeof calendarEventReminderAttemptSkippedEventSchema
>;
