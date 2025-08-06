import type { CreditDeductionInsufficientCreditsError } from '@model/Credits';
import { z } from 'zod';
import {
  actionableEventFoundEventSchema,
  type ActionableEventFoundEvent
} from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

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
    ...createEventBase('InsufficientCreditsReminderNotSent', originalEvent, {
      correlationId: originalEvent.correlationId
    }),
    data: {
      originalEvent: originalEvent.data,
      error: creditReductionResult
    }
  };
}
