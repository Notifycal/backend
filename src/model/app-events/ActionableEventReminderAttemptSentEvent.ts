import { providerVonageSentPayloadSchema } from '@model/vendor/vonage';
import type { z } from 'zod';
import { actionableEventFoundEventSchema } from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';

export const actionableEventReminderAttemptSentEventSchema = eventSchemaGenerator(
  'ActionableEventReminderAttemptSent',
  actionableEventFoundEventSchema.shape.data.extend(providerVonageSentPayloadSchema.shape)
);

export type ActionableEventReminderAttemptSentEvent = z.infer<
  typeof actionableEventReminderAttemptSentEventSchema
>;
