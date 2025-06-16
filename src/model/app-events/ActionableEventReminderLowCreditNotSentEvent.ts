import { z } from 'zod';
import { actionableEventFoundEventSchema } from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';

const dataSchema = z.object({
  originalEvent: actionableEventFoundEventSchema.shape.data,
  error: z.unknown()
});

export const actionableEventReminderLowCreditNotSentEventSchema = eventSchemaGenerator(
  'ActionableEventReminderLowCreditNotSent',
  dataSchema
);

export type ActionableEventReminderLowCreditNotSentEvent = z.infer<
  typeof actionableEventReminderLowCreditNotSentEventSchema
>;
