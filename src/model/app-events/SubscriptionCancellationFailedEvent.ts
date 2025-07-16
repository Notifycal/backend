import type { CreditDeductionResult } from '@model/Credits';
import type { IdpName, UserIdentity } from '@notifycal/shared/types';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const subscriptionCancellationFailedEventDataSchema = z.object({}).passthrough();

export const subscriptionCancellationFailedEventSchema = errorEventSchemaGenerator(
  'SubscriptionCancellationFailed',
  subscriptionCancellationFailedEventDataSchema
);

export type SubscriptionCancellationFailedEventData = z.infer<
  typeof subscriptionCancellationFailedEventDataSchema
>;
export type SubscriptionCancellationFailedEvent = z.infer<
  typeof subscriptionCancellationFailedEventSchema
>;

export function subscriptionCancellationFailedEvent<TIdpName extends IdpName>(
  userIdentity: UserIdentity<TIdpName>,
  reason: 'unpaid' | 'cancelled',
  result?: CreditDeductionResult<'clear'>,
  error?: unknown
): SubscriptionCancellationFailedEvent {
  return {
    ...createEventBase('SubscriptionCancellationFailed', userIdentity),
    data: {
      reason,
      result,
      error
    }
  };
}
