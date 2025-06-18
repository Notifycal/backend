import type { CreditDeductionInsufficientCreditsError } from '@services/credits-service';
import { z } from 'zod';
import {
  actionableEventFoundEventSchema,
  type ActionableEventFoundEvent
} from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';

const dataSchema = z.object({
  originalEvent: actionableEventFoundEventSchema.shape.data,
  error: z.unknown()
});

export const actionableEventReminderInsufficientCreditNotSentEventSchema = eventSchemaGenerator(
  'ActionableEventReminderInsufficientCreditNotSent',
  dataSchema
);

export type ActionableEventReminderInsufficientCreditNotSentEvent = z.infer<
  typeof actionableEventReminderInsufficientCreditNotSentEventSchema
>;

export function actionableEventReminderInsufficientCreditNotSent(
  originalEvent: ActionableEventFoundEvent,
  creditReductionResult: CreditDeductionInsufficientCreditsError
): ActionableEventReminderInsufficientCreditNotSentEvent {
  return {
    ...originalEvent,
    eventType: 'ActionableEventReminderInsufficientCreditNotSent' as const,
    data: {
      originalEvent: {
        ...originalEvent.data
      },
      error: creditReductionResult
    }
  };
}
