import { messagingSentPayloadSchema } from '@model/vendor/vonage/schemas';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentEventSchema } from './DemoReminderToBeSentEvent';

export const demoReminderToBeSentAttemptSentEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptSent',
  demoReminderToBeSentEventSchema.shape.data.extend(messagingSentPayloadSchema.shape)
);

export type DemoReminderToBeSentAttemptSentEvent = z.infer<
  typeof demoReminderToBeSentAttemptSentEventSchema
>;
