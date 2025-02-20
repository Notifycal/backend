import { logger } from '@common/powertools';
import type { AuditTrailStoreRecord } from '@model/store/AuditTrailStoreRecord';
import { extractErrorMessage, throwError } from '@services/common/error-handling';
import { AuditTrailBaseStore } from '@services/stores/audit-trail-base-store';
import type { Record } from '.';
import type { AuditTrailConfig } from './config';

function toStoreRecord<TEvent extends Record['body']>(event: TEvent): AuditTrailStoreRecord {
  return {
    EventId: event.eventId,
    CorrelationId: event.correlationId,
    UserId: event.userId,
    IdpId: event.idpId,
    Idp: event.idp,
    EventType: event.eventType,
    HappenedAt: event.happenedAt,
    Data: event.data
  };
}

export function recordProcessor(record: Record, config: AuditTrailConfig): Promise<void> {
  const auditTrailBaseStore = AuditTrailBaseStore.withConfig(config.auditTrailBaseStoreConfig);
  const event = record.body;
  return auditTrailBaseStore.put(toStoreRecord(event)).then(
    () => {
      logger.info(`Event has been successfully processed. Event id: ${event.eventId}`);
    },
    (error) =>
      throwError(
        `Failed to process event. Event id: ${event.eventId}. Error: ${extractErrorMessage(error)}`
      )
  );
}
