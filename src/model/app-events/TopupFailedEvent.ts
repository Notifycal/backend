import type { Identity, IdpName, TopupId } from '@notifycal/shared/types';
import type { CreditAdditionResult } from '@services/credits-service';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const topupFailedEventDataSchema = z.object({}).passthrough();

export const topupFailedEventSchema = errorEventSchemaGenerator(
  'TopupFailed',
  topupFailedEventDataSchema
);

export type TopupFailedEventData = z.infer<typeof topupFailedEventDataSchema>;
export type TopupFailedEvent = z.infer<typeof topupFailedEventSchema>;

export function topupFailedEvent<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  topupId: TopupId,
  quantity: number,
  credits: number,
  result: CreditAdditionResult | undefined,
  error: unknown
): TopupFailedEvent {
  return {
    ...createEventBase('TopupFailed', identity),
    data: {
      topupId,
      quantity,
      credits,
      result,
      error
    }
  };
}
