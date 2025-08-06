import type { CreditDeductionResult } from '@model/Credits';
import { z } from 'zod';
import {
  actionableEventFoundEventSchema,
  type ActionableEventFoundEvent
} from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const dataSchema = z.object({
  originalEvent: actionableEventFoundEventSchema.shape.data,
  lastCreditReductionResult: z.unknown()
});

export const lowCreditsDetectedEventSchema = eventSchemaGenerator('LowCreditsDetected', dataSchema);

export type LowCreditsDetectedEvent = z.infer<typeof lowCreditsDetectedEventSchema>;

export function lowCreditsDetected(
  originalEvent: ActionableEventFoundEvent,
  lastCreditReductionResult: CreditDeductionResult<'deduct'>
): LowCreditsDetectedEvent {
  return {
    ...createEventBase('LowCreditsDetected', originalEvent, {
      correlationId: originalEvent.correlationId
    }),
    data: {
      originalEvent: originalEvent.data,
      lastCreditReductionResult
    }
  };
}
