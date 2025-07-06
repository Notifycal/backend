import type { Identity, IdpName } from '@notifycal/shared/types';
import type { CreditDeductionResult } from '@services/credits-service';
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
  identity: Identity<TIdpName>,
  reason: 'unpaid' | 'cancelled',
  result?: CreditDeductionResult,
  error?: unknown
): SubscriptionCancellationFailedEvent {
  return {
    ...createEventBase('SubscriptionCancellationFailed', identity),
    data: {
      reason,
      result,
      error
    }
  };
}
