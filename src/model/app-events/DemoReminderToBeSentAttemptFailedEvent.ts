import { messagingErrorPayloadSchema } from '@model/vendor/vonage/schemas';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { baseMessagingEventDataSchema } from './messaging-common';

export const demoReminderToBeSentAttemptFailedEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptFailed',
  baseMessagingEventDataSchema.extend(messagingErrorPayloadSchema.shape)
);

export type DemoReminderToBeSentAttemptFailedEvent = z.infer<
  typeof demoReminderToBeSentAttemptFailedEventSchema
>;
