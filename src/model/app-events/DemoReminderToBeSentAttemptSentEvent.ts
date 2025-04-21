import { providerVonageSentPayloadSchema } from '@model/vendor/vonage';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentEventSchema } from './DemoReminderToBeSentEvent';

export const demoReminderToBeSentAttemptSentEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptSent',
  demoReminderToBeSentEventSchema.shape.data.extend(providerVonageSentPayloadSchema.shape)
);

export type DemoReminderToBeSentAttemptSentEvent = z.infer<
  typeof demoReminderToBeSentAttemptSentEventSchema
>;
