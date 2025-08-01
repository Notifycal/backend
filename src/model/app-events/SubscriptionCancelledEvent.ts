import type { CreditDeductionResult } from '@model/Credits';
import type { IdpName, UserIdentity } from '@notifycal/shared/types';
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
  userIdentity: UserIdentity<TIdpName>,
  reason: 'unpaid' | 'cancelled',
  result: CreditDeductionResult<'clear'>
): SubscriptionCancelledEvent {
  return {
    ...createEventBase('SubscriptionCancelled', userIdentity),
    data: {
      reason,
      result
    }
  };
}
