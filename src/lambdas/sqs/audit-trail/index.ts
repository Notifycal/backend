import { BatchProcessor, EventType, processPartialResponse } from '@aws-lambda-powertools/batch';
import type { PartialItemFailureResponse } from '@aws-lambda-powertools/batch/types';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { baseEventSchema } from '@model/app-events/BaseEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { Context } from 'aws-lambda';
import type { z } from 'zod';
import { type AuditTrailConfig, readAuditTrailConfig } from './config';
import { recordProcessor } from './record-processor';

const eventSchema = eventSqsSchema<AuditTrailConfig, typeof baseEventSchema>(baseEventSchema);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function lambdaHandler(event: Event, context: Context): Promise<PartialItemFailureResponse> {
  logger.info(`Processing sqs message in audit trail lambda. Event: ${JSON.stringify(event)}`);
  return processPartialResponse(event, recordProcessor, new BatchProcessor(EventType.SQS));
}
export const handler = backgroundProcessingMiddleware(
  () => readAuditTrailConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
