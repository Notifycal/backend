import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentEventSchema } from './DemoReminderToBeSentEvent';
import { providerSentPayloadSchema } from './common';

export const demoReminderToBeSentAttemptSentEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptSent',
  demoReminderToBeSentEventSchema.shape.data.extend(providerSentPayloadSchema.shape)
);

export type DemoReminderToBeSentAttemptSentEvent = z.infer<
  typeof demoReminderToBeSentAttemptSentEventSchema
>;
