import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentAttemptSentEventSchema } from './DemoReminderToBeSentAttemptSentEvent';

export const demoReminderToBeSentAttemptSkippedEventEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptSkipped',
  demoReminderToBeSentAttemptSentEventSchema.shape.data
);

export type DemoReminderToBeSentAttemptSkippedEvent = z.infer<
  typeof demoReminderToBeSentAttemptSkippedEventEventSchema
>;
