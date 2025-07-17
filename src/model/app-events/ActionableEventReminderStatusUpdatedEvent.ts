import type { CreditAdditionResult, CreditDeductionResult } from '@model/Credits';
import { messagingMessageStatusPayloadSchema } from '@model/vendor/vonage/schemas';
import { z } from 'zod';
import { actionableEventReminderAttemptSentEventSchema } from './ActionableEventReminderAttemptSentEvent';
import { eventSchemaGenerator } from './BaseEvent';

export const actionableEventReminderStatusUpdatedEventSchema = eventSchemaGenerator(
  'ActionableEventReminderStatusUpdated',
  actionableEventReminderAttemptSentEventSchema.shape.data.extend({
    ...messagingMessageStatusPayloadSchema.shape,
    creditAdjustmentResult: z
      .custom<CreditAdditionResult<'restore'> | CreditDeductionResult<'deduct'>>()
      .optional()
  })
);

export type ActionableEventReminderStatusUpdatedEvent = z.infer<
  typeof actionableEventReminderStatusUpdatedEventSchema
>;
