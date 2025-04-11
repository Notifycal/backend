import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { reminderToBeSentAttemptSentEventSchema } from './ReminderToBeSentAttemptSentEvent';

export const reminderToBeSentAttemptSkippedEventEventSchema = eventSchemaGenerator(
  'ReminderToBeSentAttemptSkipped',
  reminderToBeSentAttemptSentEventSchema.shape.data
);

export type ReminderToBeSentAttemptSkippedEvent = z.infer<
  typeof reminderToBeSentAttemptSkippedEventEventSchema
>;
