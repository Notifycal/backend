import { messagingErrorPayloadSchema } from '@model/vendor/vonage/schemas';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { baseMessagingEventDataSchema } from './messaging-common';

export const actionableEventReminderAttemptFailedEventSchema = eventSchemaGenerator(
  'ActionableEventReminderAttemptFailed',
  baseMessagingEventDataSchema.extend(messagingErrorPayloadSchema.shape)
);

export type ActionableEventReminderAttemptFailedEvent = z.infer<
  typeof actionableEventReminderAttemptFailedEventSchema
>;
