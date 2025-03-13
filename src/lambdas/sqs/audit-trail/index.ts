import { BatchProcessor, EventType, processPartialResponse } from '@aws-lambda-powertools/batch';
import type { PartialItemFailureResponse } from '@aws-lambda-powertools/batch/types';
import { EventBridgeSchema } from '@aws-lambda-powertools/parser/schemas';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { baseEventSchema } from '@model/app-events/BaseEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { Context } from 'aws-lambda';
import { z } from 'zod';
import { type AuditTrailConfig, readAuditTrailConfig } from './config';
import { recordProcessor } from './record-processor';

const schemas = z.union([baseEventSchema, EventBridgeSchema]);
const eventSchema = eventSqsSchema<AuditTrailConfig, typeof schemas>(schemas);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;

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
