import { BatchProcessor, EventType, processPartialResponse } from '@aws-lambda-powertools/batch';
import type { PartialItemFailureResponse } from '@aws-lambda-powertools/batch/types';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { userCalendarFetchedEventSchema } from '@model/app-events/UserCalendarFetchedEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { Context } from 'aws-lambda';
import type { z } from 'zod';
import { readActionableEventsConfig, type ActionableEventsConfig } from './config';
import { process } from './record-processor';

const eventSchema = eventSqsSchema<ActionableEventsConfig, typeof userCalendarFetchedEventSchema>(
  userCalendarFetchedEventSchema
);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;

function recordHandler(record: Record): Promise<void> {
  return process(record);
}

function lambdaHandler(event: Event, context: Context): Promise<PartialItemFailureResponse> {
  logger.info(`Processing sqs message in second lambda. Event: ${JSON.stringify(event)}`);
  return processPartialResponse(event, recordHandler, new BatchProcessor(EventType.SQS), {
    context
  });
}
export const handler = backgroundProcessingMiddleware(
  () => readActionableEventsConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
