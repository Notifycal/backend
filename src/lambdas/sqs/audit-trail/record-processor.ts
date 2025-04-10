import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { logger, metrics as metricsSingleton } from '@common/powertools';
import type { EventType } from '@model/app-events/BaseEvent';
import type {
  AuditTrailStoreRecord,
  AuditTrailStoreRecordOrigin
} from '@model/store/AuditTrailStoreRecord';
import type { CorrelationId, DateTime, EventId, UserId } from '@notifycal/shared/types';
import { throwError } from '@services/common/error-handling';
import { AuditTrailBaseStore } from '@services/stores/audit-trail-base-store';
import type MetricsAggregator from '@utils/MetricsAggregator';
import { match, P } from 'ts-pattern';
import type { AuditTrailConfig } from './config';
import type { Record } from './schema';

function toStoreRecord(r: Record): Promise<AuditTrailStoreRecord> {
  return match(r)
    .with(
      { body: { eventType: P.any, eventId: P.string, happenedAt: P.string } },
      ({ body: event, eventSourceARN }) =>
        Promise.resolve({
          EventId: event.eventId,
          CorrelationId: event.correlationId,
          UserId: event.userId,
          IdpId: event.idpId,
          Idp: event.idp,
          EventType: event.eventType,
          HappenedAt: event.happenedAt,
          Data: event.data,
          Origin: eventSourceARN as AuditTrailStoreRecordOrigin
        })
    )
    .with(
      { body: { 'detail-type': P.string, time: P.string, id: P.string } },
      ({ body: event, eventSourceARN }) =>
        Promise.resolve({
          EventId: event.id as EventId,
          CorrelationId: event.id as CorrelationId,
          UserId: 'System' as UserId,
          IdpId: 'N/A' as const,
          Idp: 'N/A' as const,
          EventType: event['detail-type'] as EventType,
          HappenedAt: event.time as DateTime,
          Data: event,
          Origin: eventSourceARN as AuditTrailStoreRecordOrigin
        })
    )
    .exhaustive();
}

function withEventMetric(
  event: AuditTrailStoreRecord,
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
