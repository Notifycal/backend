import type { CreditDeductionInsufficientCreditsError } from '@services/credits-service';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import {
  demoReminderToBeSentEventSchema,
  type DemoReminderToBeSentEvent
} from './DemoReminderToBeSentEvent';

const dataSchema = z.object({
  originalEvent: demoReminderToBeSentEventSchema.shape.data,
  error: z.unknown()
});

export const demoReminderInsufficientCreditNotSentEventSchema = eventSchemaGenerator(
  'DemoReminderInsufficientCreditNotSent',
  dataSchema
);

export type DemoReminderInsufficientCreditNotSentEvent = z.infer<
  typeof demoReminderInsufficientCreditNotSentEventSchema
>;

export function demoReminderInsufficientCreditNotSent(
  originalEvent: DemoReminderToBeSentEvent,
  creditReductionResult: CreditDeductionInsufficientCreditsError
): DemoReminderInsufficientCreditNotSentEvent {
  return {
    ...originalEvent,
    eventType: 'DemoReminderInsufficientCreditNotSent',
    data: {
      originalEvent: originalEvent.data,
      error: creditReductionResult
    }
  };
}
