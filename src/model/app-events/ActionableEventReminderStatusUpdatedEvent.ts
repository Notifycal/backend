import type { z } from 'zod';
import { actionableEventReminderAttemptSentEventSchema } from './ActionableEventReminderAttemptSentEvent';
import { eventSchemaGenerator } from './BaseEvent';
import { providerMessageStatusPayloadSchema } from './common';

export const actionableEventReminderStatusUpdatedEventSchema = eventSchemaGenerator(
  'ActionableEventReminderStatusUpdated',
  actionableEventReminderAttemptSentEventSchema.shape.data.extend(
    providerMessageStatusPayloadSchema.shape
  )
);

export type ActionableEventReminderStatusUpdatedEvent = z.infer<
  typeof actionableEventReminderStatusUpdatedEventSchema
>;
