import { BatchProcessor, EventType, processPartialResponse } from '@aws-lambda-powertools/batch';
import type { PartialItemFailureResponse } from '@aws-lambda-powertools/batch/types';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { AuditTrailBaseStore } from '@services/stores/audit-trail-base-store';
import type { Context } from 'aws-lambda';
import { readAuditTrailConfig, type AuditTrailConfig } from './config';
import { recordProcessor } from './record-processor';
import { eventSchema, type Event, type Record } from './schema';

export function recordProcessorCurried(
  config: AuditTrailConfig
): (record: Record) => Promise<void> {
  const auditTrailBaseStore = AuditTrailBaseStore.withConfig(
    config.auditTrailBaseStoreConfig,
    logger
  );
  return (record: Record) => {
    const _logger = logger.createChild();
    return recordProcessor(record, auditTrailBaseStore, _logger);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function lambdaHandler(event: Event, context: Context): Promise<PartialItemFailureResponse> {
  return processPartialResponse(
    event,
    recordProcessorCurried(event.lambdaConfig),
    new BatchProcessor(EventType.SQS)
  ).catch((error) => {
    logger.error(`Failed to process event`, { error });
    throw error;
  });
}
const handler = backgroundProcessingMiddleware(readAuditTrailConfig, eventSchema).handler<Event>(
  lambdaHandler
);

module.exports = { handler };
