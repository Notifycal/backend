import type {
  CorrelationId,
  DateTime,
  EventId,
  Identity,
  IdpName,
  TopupId
} from '@notifycal/shared/types';
import type { CreditAdditionResult } from '@services/credits-service';
import { v4 } from 'uuid';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';

const topupSucceededEventDataSchema = z.object({}).passthrough();

export const topupSucceededEventSchema = eventSchemaGenerator(
  'TopupSucceeded',
  topupSucceededEventDataSchema
);

export type TopupSucceededEventData = z.infer<typeof topupSucceededEventDataSchema>;
export type TopupSucceededEvent = z.infer<typeof topupSucceededEventSchema>;

export function topupSucceededEvent<TIdpName extends IdpName>(
  identity: Identity<TIdpName>,
  topupId: TopupId,
  quantity: number,
  credits: number,
  result: CreditAdditionResult
): TopupSucceededEvent {
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'TopupSucceeded',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {
      topupId,
      quantity,
      credits,
      result
    }
  };
}
