import { creditDeductionDeductResultSchema, type CreditDeductionResult } from '@model/Credits';
import { messagingSentPayloadSchema } from '@model/vendor/vonage/schemas';
import type { Uuid } from '@notifycal/shared/types';
import type { z } from 'zod';
import {
  actionableEventFoundEventSchema,
  type ActionableEventFoundEvent
} from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

export const actionableEventReminderAttemptSentEventSchema = eventSchemaGenerator(
  'ActionableEventReminderAttemptSent',
  actionableEventFoundEventSchema.shape.data.extend({
    ...messagingSentPayloadSchema.shape,
    creditDeductionResult: creditDeductionDeductResultSchema
  })
);

export type ActionableEventReminderAttemptSentEvent = z.infer<
  typeof actionableEventReminderAttemptSentEventSchema
>;

export function actionableEventReminderAttemptSent(
  originalEvent: ActionableEventFoundEvent,
  messageSentUUID: Uuid,
  creditDeductionResult: CreditDeductionResult<'deduct'>
): ActionableEventReminderAttemptSentEvent {
  return {
    ...createEventBase('ActionableEventReminderAttemptSent', originalEvent, {
      correlationId: originalEvent.correlationId
    }),
    data: {
      ...originalEvent.data,
      messageUUID: messageSentUUID,
      creditDeductionResult
    }
  };
}
