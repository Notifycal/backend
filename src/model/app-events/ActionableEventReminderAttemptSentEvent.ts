import type { z } from 'zod';
import { actionableEventFoundEventSchema } from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';
import { providerSentPayloadSchema } from './common';

export const actionableEventReminderAttemptSentEventSchema = eventSchemaGenerator(
  'ActionableEventReminderAttemptSent',
  actionableEventFoundEventSchema.shape.data.extend(providerSentPayloadSchema.shape)
);

export type ActionableEventReminderAttemptSentEvent = z.infer<
  typeof actionableEventReminderAttemptSentEventSchema
>;
