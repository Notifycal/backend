import type { z } from 'zod';
import { actionableEventReminderAttemptSentEventSchema } from './ActionableEventReminderAttemptSentEvent';
import { eventSchemaGenerator } from './BaseEvent';

export const actionableEventReminderAttemptSkippedEventSchema = eventSchemaGenerator(
  'ActionableEventReminderAttemptSkipped',
  actionableEventReminderAttemptSentEventSchema.shape.data
);

export type ActionableEventReminderAttemptSkippedEvent = z.infer<
  typeof actionableEventReminderAttemptSkippedEventSchema
>;
