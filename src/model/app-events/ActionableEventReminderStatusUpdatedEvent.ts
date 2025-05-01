import { messagingMessageStatusPayloadSchema } from '@model/vendor/vonage/schemas';
import type { z } from 'zod';
import { actionableEventReminderAttemptSentEventSchema } from './ActionableEventReminderAttemptSentEvent';
import { eventSchemaGenerator } from './BaseEvent';

export const actionableEventReminderStatusUpdatedEventSchema = eventSchemaGenerator(
  'ActionableEventReminderStatusUpdated',
  actionableEventReminderAttemptSentEventSchema.shape.data.extend(
    messagingMessageStatusPayloadSchema.shape
  )
);

export type ActionableEventReminderStatusUpdatedEvent = z.infer<
  typeof actionableEventReminderStatusUpdatedEventSchema
>;
