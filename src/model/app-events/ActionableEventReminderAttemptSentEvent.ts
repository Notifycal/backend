import { uuidSchema } from '@notifycal/shared/schemas';
import type { z } from 'zod';
import { actionableEventFoundEventSchema } from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';

export const actionableEventReminderAttemptSentEventSchema = eventSchemaGenerator(
  'ActionableEventReminderAttemptSent',
  actionableEventFoundEventSchema.shape.data.extend({
    messageUUID: uuidSchema
  })
);

export type ActionableEventReminderAttemptSentEvent = z.infer<
  typeof actionableEventReminderAttemptSentEventSchema
>;
