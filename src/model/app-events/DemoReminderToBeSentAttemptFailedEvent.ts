import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentEventSchema } from './DemoReminderToBeSentEvent';
import { providerErrorPayloadSchema } from './common';

export const demoReminderToBeSentAttemptFailedEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptFailed',
  demoReminderToBeSentEventSchema.shape.data.extend(providerErrorPayloadSchema.shape)
);

export type DemoReminderToBeSentAttemptFailedEvent = z.infer<
  typeof demoReminderToBeSentAttemptFailedEventSchema
>;
