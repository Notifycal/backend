import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { logger, metrics } from '@common/powertools';
import type {
  AuditTrailStoreRecord,
  AuditTrailStoreRecordOrigin
} from '@model/store/AuditTrailStoreRecord';
import { throwError } from '@services/common/error-handling';
import { AuditTrailBaseStore } from '@services/stores/audit-trail-base-store';
import type { AuditTrailConfig } from './config';
import type { Record } from './schema';

function toStoreRecord(r: Record): Promise<AuditTrailStoreRecord> {
  return Promise.resolve({
    EventId: r.body.eventId,
    CorrelationId: r.body.correlationId,
    UserId: r.body.userId,
    IdpId: r.body.idpId,
    Idp: r.body.idp,
    EventType: r.body.eventType,
    HappenedAt: r.body.happenedAt,
    Data: r.body.data,
    Origin: r.eventSourceARN as AuditTrailStoreRecordOrigin
  });
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
