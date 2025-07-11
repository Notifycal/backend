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

export const insufficientCreditReminderNotSentEventSchema = eventSchemaGenerator(
  'InsufficientCreditsReminderNotSent',
  dataSchema
);

export type InsufficientCreditReminderNotSentEvent = z.infer<
  typeof insufficientCreditReminderNotSentEventSchema
>;

export function insufficientCreditReminderNotSent(
  originalEvent: ActionableEventFoundEvent,
  creditReductionResult: CreditDeductionInsufficientCreditsError
): InsufficientCreditReminderNotSentEvent {
  return {
    ...originalEvent,
    eventType: 'InsufficientCreditsReminderNotSent',
    data: {
      originalEvent: originalEvent.data,
      error: creditReductionResult
    }
  };
}
