import type { CreditDeductionResult } from '@services/credits-service';
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

export const lowCreditsDetectedEventSchema = eventSchemaGenerator('LowCreditsDetected', dataSchema);

export type LowCreditsDetectedEvent = z.infer<typeof lowCreditsDetectedEventSchema>;

export function lowCreditsDetected(
  originalEvent: ActionableEventFoundEvent,
  creditReductionResult: CreditDeductionResult
): LowCreditsDetectedEvent {
  return {
    ...originalEvent,
    eventType: 'LowCreditsDetected',
    data: {
      originalEvent: originalEvent.data,
      error: creditReductionResult
    }
  };
}
