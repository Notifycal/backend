import { BatchProcessor, EventType, processPartialResponse } from '@aws-lambda-powertools/batch';
import type { PartialItemFailureResponse } from '@aws-lambda-powertools/batch/types';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import type { Context } from 'aws-lambda';
import { readAuditTrailConfig, type AuditTrailConfig } from './config';
import { recordProcessor } from './record-processor';
import { eventSchema, type Event, type Record } from './schema';

export function recordProcessorCurried(
  config: AuditTrailConfig
): (record: Record) => Promise<void> {
  return (record: Record) => recordProcessor(record, config);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function lambdaHandler(event: Event, context: Context): Promise<PartialItemFailureResponse> {
  logger.info(`Processing sqs message in audit trail lambda. Event: ${JSON.stringify(event)}`);
  return processPartialResponse(
    event,
    recordProcessorCurried(event.lambdaConfig),
    new BatchProcessor(EventType.SQS)
  ).catch((error) => {
    logger.error(`Failed to process event. Error: ${JSON.stringify(error)}`);
    throw error;
  });
}
export const handler = backgroundProcessingMiddleware(
  () => readAuditTrailConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
