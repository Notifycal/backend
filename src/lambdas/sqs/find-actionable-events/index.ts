import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { userCalendarFetchedEventSchema } from '@model/app-events/UserCalendarFetchedEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { z } from 'zod';
import { readActionableEventsConfig, type ActionableEventsConfig } from './config';
import type { Context } from 'aws-lambda';

const eventSchema = eventSqsSchema<ActionableEventsConfig>(userCalendarFetchedEventSchema);
export type Event = z.infer<typeof eventSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function lambdaHandler(event: Event, context: Context): Promise<void> {
  logger.info(`Processing sqs message in second lambda. Event: ${JSON.stringify(event)}`);
  return Promise.resolve();
}
export const handler = backgroundProcessingMiddleware(
  () => readActionableEventsConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
