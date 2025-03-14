import { uuidSchema } from '@notifycal/shared/schemas';
import type { z } from 'zod';
import { actionableEventFoundEventSchema } from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';

export const calendarEventReminderAttemptSentEventSchema = eventSchemaGenerator(
  'CalendarEventReminderAttemptSent',
  actionableEventFoundEventSchema.shape.data.extend({
    messageUUID: uuidSchema
  })
);

export type CalendarEventReminderAttemptSentEvent = z.infer<
  typeof calendarEventReminderAttemptSentEventSchema
>;
