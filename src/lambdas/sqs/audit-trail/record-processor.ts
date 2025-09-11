import type { Logger } from '@aws-lambda-powertools/logger';
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { metrics as metricsSingleton } from '@common/powertools';
import type { EventType } from '@model/app-events/BaseEvent';
import type {
  AuditTrailStoreRecord,
  AuditTrailStoreRecordOrigin
} from '@model/store/AuditTrailStoreRecord';
import type {
  CorrelationId,
  DateTime,
  EventId,
  UnixTimestamp,
  UserId
} from '@notifycal/shared/types';
import { rethrowError } from '@services/common/error-handling';
import { setupLoggerForAuditStoreRecordProcessing } from '@services/common/logger';
import type { AuditTrailBaseStore } from '@services/stores/audit-trail-base-store';
import type MetricsAggregator from '@utils/MetricsAggregator';
import { DateTime as DT } from 'luxon';
import { match, P } from 'ts-pattern';
import type { Record } from './schema';

function toStoreRecord(r: Record, ttlInDays: number): AuditTrailStoreRecord {
  const expiresAt = DT.now().plus({ day: ttlInDays }).toUnixInteger() as UnixTimestamp;
  return match(r)
    .with(
      { body: { eventType: P.any, eventId: P.string, happenedAt: P.string } },
      ({ body: event, eventSourceARN }) => ({
        EventId: event.eventId,
        CorrelationId: event.correlationId,
        UserId: event.userId,
        IdpId: event.idpId,
        Idp: event.idp,
        EventType: event.eventType,
        HappenedAt: event.happenedAt,
        Data: event.data,
        Origin: eventSourceARN as AuditTrailStoreRecordOrigin,
        ExpiresAt: expiresAt
      })
    )
    .with(
      { body: { 'detail-type': P.string, time: P.string, id: P.string } },
      ({ body: event, eventSourceARN }) => ({
        EventId: event.id as EventId,
        CorrelationId: event.id as CorrelationId,
        UserId: 'System' as UserId,
        IdpId: 'N/A' as const,
        Idp: 'N/A' as const,
        EventType: event['detail-type'] as EventType,
        HappenedAt: event.time as DateTime,
        Data: event,
        Origin: eventSourceARN as AuditTrailStoreRecordOrigin,
        ExpiresAt: expiresAt
      })
    )
    .exhaustive();
}

function withEventMetric(
  event: AuditTrailStoreRecord,
  logger: Logger,
  metrics: MetricsAggregator = metricsSingleton
): AuditTrailStoreRecord {
  const auditTrailStoreRecordDimensionData = {
    eventType: event.EventType,
    origin: event.Origin,
    idp: event.Idp
  };
  const auditTrailStoreRecordMetadataData = {
    eventId: event.EventId,
    correlationId: event.CorrelationId,
    userId: event.UserId,
    idpId: event.IdpId
  };

  try {
    metrics.addMetric(
      'EventPublished',
      MetricUnit.Count,
      1,
      auditTrailStoreRecordDimensionData,
      auditTrailStoreRecordMetadataData,
      new Date(event.HappenedAt)
    );
  } catch (error) {
    logger.info('Could not add EventPublished Cloudwatch Metric.', {
      error,
      event
    });
  }

  return event;
}

export function recordProcessor(
  record: Record,
  recordTtlInDays: number,
  auditTrailBaseStore: AuditTrailBaseStore,
  logger: Logger
): Promise<void> {
  const storeRecord = toStoreRecord(record, recordTtlInDays);
  setupLoggerForAuditStoreRecordProcessing(storeRecord, logger);
  return auditTrailBaseStore
    .put(storeRecord)
    .then(() => withEventMetric(storeRecord, logger))
    .then(
      (storeRecord) => {
        logger.info(`Event has been successfully processed`, { eventId: storeRecord.EventId });
      },
      (error) => rethrowError(`Failed to process event`, error, logger, { event: record.body })
    );
}
