import type { CreditDeductionResult } from '@model/Credits';
import { messagingSentPayloadSchema } from '@model/vendor/vonage/schemas';
import type { Uuid } from '@notifycal/shared/types';
import { z } from 'zod';
import {
  actionableEventFoundEventSchema,
  type ActionableEventFoundEvent
} from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';

export const actionableEventReminderAttemptSentEventSchema = eventSchemaGenerator(
  'ActionableEventReminderAttemptSent',
  actionableEventFoundEventSchema.shape.data.extend({
    ...messagingSentPayloadSchema.shape,
    creditDeductionResult: z.custom<CreditDeductionResult<'deduct'>>()
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
    ...originalEvent,
    eventType: 'ActionableEventReminderAttemptSent',
    data: {
      ...originalEvent.data,
      messageUUID: messageSentUUID,
      creditDeductionResult
    }
  };
}
