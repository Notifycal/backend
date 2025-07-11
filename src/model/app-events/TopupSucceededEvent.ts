import type { CreditAdditionResult } from '@model/Credits';
import type { IdpName, TopupId, UserIdentity } from '@notifycal/shared/types';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const topupSucceededEventDataSchema = z.object({}).passthrough();

export const topupSucceededEventSchema = eventSchemaGenerator(
  'TopupSucceeded',
  topupSucceededEventDataSchema
);

export type TopupSucceededEventData = z.infer<typeof topupSucceededEventDataSchema>;
export type TopupSucceededEvent = z.infer<typeof topupSucceededEventSchema>;

export function topupSucceededEvent<TIdpName extends IdpName>(
  userIdentity: UserIdentity<TIdpName>,
  topupId: TopupId,
  quantity: number,
  credits: number,
  result: CreditAdditionResult
): TopupSucceededEvent {
  return {
    ...createEventBase('TopupSucceeded', userIdentity),
    data: {
      topupId,
      quantity,
      credits,
      result
    }
  };
}
