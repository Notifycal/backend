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
import { errorEventSchemaGenerator } from './BaseEvent';

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
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: eventId as CorrelationId,
    eventType: 'TopupFailed',
    happenedAt: new Date().toISOString() as DateTime,
    userId: identity.userId,
    idp: identity.idp,
    idpId: identity.idpId,
    data: {
      topupId,
      quantity,
      credits,
      result,
      error
    }
  };
}
