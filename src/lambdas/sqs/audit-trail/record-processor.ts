import { logger } from '@common/powertools';
import type { AuditTrailStoreRecord } from '@model/store/AuditTrailStoreRecord';
import { extractErrorMessage, throwError } from '@services/common/error-handling';
import { AuditTrailBaseStore } from '@services/stores/audit-trail-base-store';
import { match, P } from 'ts-pattern';
import type { AuditTrailConfig } from './config';
import type { Record } from './schema';

function toStoreRecord(r: Record['body']): Promise<AuditTrailStoreRecord> {
  return match(r)
    .with({ eventType: P.any, eventId: P.string, happenedAt: P.string }, (event) =>
      Promise.resolve({
        EventId: event.eventId,
        CorrelationId: event.correlationId,
        UserId: event.userId,
        IdpId: event.idpId,
        Idp: event.idp,
        EventType: event.eventType,
        HappenedAt: event.happenedAt,
        Data: event.data
      })
    )
    .with({ 'detail-type': P.string, time: P.string, id: P.string }, () =>
      Promise.reject(
        new Error(
          `We are provoking this error on purpose to reproduce the cockup that took place on 20250303. Revert this commit as soon as testing is complete`
        )
      )
    )
    .exhaustive();
}

export function recordProcessor(record: Record, config: AuditTrailConfig): Promise<void> {
  const auditTrailBaseStore = AuditTrailBaseStore.withConfig(config.auditTrailBaseStoreConfig);
  const event = record.body;
  return toStoreRecord(event)
    .then((storeRecord) => auditTrailBaseStore.put(storeRecord).then(() => storeRecord))
    .then(
      (storeRecord) => {
        logger.info(`Event has been successfully processed. Event id: ${storeRecord.EventId}`);
      },
      (error) =>
        throwError(
          `Failed to process event. Event: ${JSON.stringify(record.body)}. Error: ${extractErrorMessage(error)}`
        )
    );
}
