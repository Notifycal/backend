import { z } from 'zod';
import { actionableEventFoundEventSchema } from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';

export const actionableEventReminderAttemptFailedEventSchema = eventSchemaGenerator(
  'ActionableEventReminderAttemptFailed',
  actionableEventFoundEventSchema.shape.data.extend({
    providerErrorPayload: z.any() // TODO: review this schema when we've replaced the Vonage SDK with Axios
  })
);

export type ActionableEventReminderAttemptFailedEvent = z.infer<
  typeof actionableEventReminderAttemptFailedEventSchema
>;
