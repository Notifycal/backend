import { messagingErrorPayloadSchema } from '@model/vendor/vonage/schemas';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentEventSchema } from './DemoReminderToBeSentEvent';

export const demoReminderToBeSentAttemptFailedEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptFailed',
  demoReminderToBeSentEventSchema.shape.data.extend(messagingErrorPayloadSchema.shape)
);

export type DemoReminderToBeSentAttemptFailedEvent = z.infer<
  typeof demoReminderToBeSentAttemptFailedEventSchema
>;
