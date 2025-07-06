import type { Identity, IdpName } from '@notifycal/shared/types';
import type { CreditDeductionResult } from '@services/credits-service';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const subscriptionCancelledEventDataSchema = z.object({}).passthrough();

export const subscriptionCancelledEventSchema = eventSchemaGenerator(
  'SubscriptionCancelled',
  subscriptionCancelledEventDataSchema
);

export type SubscriptionCancelledEventData = z.infer<typeof subscriptionCancelledEventDataSchema>;
export type SubscriptionCancelledEvent = z.infer<typeof subscriptionCancelledEventSchema>;

export function subscriptionCancelledEvent<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  reason: 'unpaid' | 'cancelled',
  result: CreditDeductionResult
): SubscriptionCancelledEvent {
  return {
    ...createEventBase('SubscriptionCancelled', identity),
    data: {
      reason,
      result
    }
  };
}
