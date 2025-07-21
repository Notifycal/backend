import type { CreditAdditionResult, CreditDeductionResult } from '@model/Credits';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase, type EventSourceIdentity } from './common';

const creditsAdjustedEventDataSchema = z.object({}).passthrough();

export const creditsAdjustedEventSchema = eventSchemaGenerator(
  'CreditsAdjusted',
  creditsAdjustedEventDataSchema
);

export type CreditsAdjustedEventData = z.infer<typeof creditsAdjustedEventDataSchema>;
export type CreditsAdjustedEvent = z.infer<typeof creditsAdjustedEventSchema>;

export function creditsAdjustedEvent(
  eventSource: EventSourceIdentity,
  creditRestoreResult?: CreditAdditionResult<'restore'>,
  creditDeductionResult?: CreditDeductionResult<'deduct'>
): CreditsAdjustedEvent {
  return {
    ...createEventBase('CreditsAdjusted', eventSource),
    data: {
      creditRestoreResult,
      creditDeductionResult
    }
  };
}
