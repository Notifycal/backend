import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { logger, metrics } from '@common/powertools';
import type { EventType } from '@model/app-events/BaseEvent';
import type {
  AuditTrailStoreRecord,
  AuditTrailStoreRecordOrigin
} from '@model/store/AuditTrailStoreRecord';
import type {
  CorrelationId,
  DateTime,
  EventId,
  IdpId,
  IdpName,
  UserId
} from '@notifycal/shared/types';
import { throwError } from '@services/common/error-handling';
import { AuditTrailBaseStore } from '@services/stores/audit-trail-base-store';
import { match, P } from 'ts-pattern';
import type { AuditTrailConfig } from './config';
import type { Record } from './schema';

function toStoreRecord(r: Record): Promise<AuditTrailStoreRecord> {
  return match(r)
    .with({ body: { eventType: P.any, eventId: P.string, happenedAt: P.string } }, () =>
      Promise.reject(new Error('Boom!!!! We are trying out partial batch processing'))
    )
    .with(
      { body: { 'detail-type': P.string, time: P.string, id: P.string } },
      ({ body: event, eventSourceARN }) =>
        Promise.resolve({
          EventId: event.id as EventId,
          CorrelationId: event.id as CorrelationId,
          UserId: 'System' as UserId,
          IdpId: 'N/A' as IdpId,
          Idp: 'N/A' as IdpName,
          EventType: event['detail-type'] as EventType,
          HappenedAt: event.time as DateTime,
          Data: event,
          Origin: eventSourceARN as AuditTrailStoreRecordOrigin
        })
    )
    .exhaustive();
}

function withEventMetric(event: AuditTrailStoreRecord): AuditTrailStoreRecord {
  try {
    metrics.addMetric(event.EventType, MetricUnit.Count, 1);
    metrics.addMetadata('eventId', event.EventId);
    metrics.addMetadata('correlationId', event.CorrelationId);
    if (event.HappenedAt) {
      metrics.setTimestamp(new Date(event.HappenedAt));
    }
  } catch (error) {
    logger.info('Could not add EventType Cloudwatch Metric.', {
      error,
      event
    });
  }

  return event;
}

export function recordProcessor(record: Record, config: AuditTrailConfig): Promise<void> {
  const auditTrailBaseStore = AuditTrailBaseStore.withConfig(config.auditTrailBaseStoreConfig);
  return toStoreRecord(record)
    .then((storeRecord) => auditTrailBaseStore.put(storeRecord).then(() => storeRecord))
    .then((storeRecord) => withEventMetric(storeRecord))
    .then(
      (storeRecord) => {
        logger.info(`Event has been successfully processed`, { eventId: storeRecord.EventId });
      },
      (error) => throwError(`Failed to process event`, error, { event: record.body })
    );
}
