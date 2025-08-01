import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentAttemptSentEventSchema } from './DemoReminderToBeSentAttemptSentEvent';

export const demoReminderToBeSentAttemptSkippedEventEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptSkipped',
  demoReminderToBeSentAttemptSentEventSchema.shape.data.omit({ demoCounterIncrementResult: true })
);

export type DemoReminderToBeSentAttemptSkippedEvent = z.infer<
  typeof demoReminderToBeSentAttemptSkippedEventEventSchema
>;
