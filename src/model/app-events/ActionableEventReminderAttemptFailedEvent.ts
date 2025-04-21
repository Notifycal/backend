import { providerVonageErrorPayloadSchema } from '@model/vendor/vonage';
import type { z } from 'zod';
import { actionableEventFoundEventSchema } from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';

export const actionableEventReminderAttemptFailedEventSchema = eventSchemaGenerator(
  'ActionableEventReminderAttemptFailed',
  actionableEventFoundEventSchema.shape.data.extend(providerVonageErrorPayloadSchema.shape)
);

export type ActionableEventReminderAttemptFailedEvent = z.infer<
  typeof actionableEventReminderAttemptFailedEventSchema
>;
