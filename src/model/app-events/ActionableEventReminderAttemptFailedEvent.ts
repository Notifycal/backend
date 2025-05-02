import { messagingErrorPayloadSchema } from '@model/vendor/vonage/schemas';
import type { z } from 'zod';
import { actionableEventFoundEventSchema } from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';

export const actionableEventReminderAttemptFailedEventSchema = eventSchemaGenerator(
  'ActionableEventReminderAttemptFailed',
  actionableEventFoundEventSchema.shape.data.extend(messagingErrorPayloadSchema.shape)
);

export type ActionableEventReminderAttemptFailedEvent = z.infer<
  typeof actionableEventReminderAttemptFailedEventSchema
>;
