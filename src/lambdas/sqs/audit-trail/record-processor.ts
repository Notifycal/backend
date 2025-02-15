import { logger } from '@common/powertools';
import type { BaseEvent } from '@model/app-events/BaseEvent';
import type { EventStoreRecord } from '@model/store/EventRecordStore';
import type { UnixTimestamp } from '@notifycal/shared/types';
import { extractErrorMessage, throwError } from '@services/common/error-handling';
import { AuditTrailBaseStore } from '@services/stores/audit-trail-base-store';
import { DateTime } from 'luxon';
import type { Record } from '.';
import type { AuditTrailConfig } from './config';

function toStoreRecord<TEvent extends BaseEvent>(
  event: TEvent,
  expiresAtInDays: number
): EventStoreRecord {
  return {
    EventId: event.eventId,
    CorrelationId: event.correlationId,
    UserId: event.userId,
    IdpId: event.idpId,
    Idp: event.idp,
    EventType: event.eventType,
    HappenedAt: event.happenedAt,
    Data: event.data,
    ExpiresAt: DateTime.fromISO(event.happenedAt)
      .plus({ days: expiresAtInDays })
      .toUnixInteger() as UnixTimestamp
  };
}

export function recordProcessor(record: Record, config: AuditTrailConfig): Promise<void> {
  const auditTrailBaseStore = AuditTrailBaseStore.withConfig(config.auditTrailBaseStoreConfig);
  const event = record.body;
  return auditTrailBaseStore
    .put(toStoreRecord(event, config.recordExpiresAtConfig.expiresAtInDays))
    .then(
      () => {
        logger.info(`Event has been successfully processed. Event id: ${event.eventId}`);
      },
      (error) =>
        throwError(
          `Failed to process event. Event id: ${event.eventId}. Error: ${extractErrorMessage(error)}`
        )
    );
}
