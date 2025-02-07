import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { userCalendarFetchedEventSchema } from '@model/app-events/UserCalendarFetchedEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { z } from 'zod';
import { readActionableEventsConfig, type ActionableEventsConfig } from './config';

const eventSchema = eventSqsSchema<ActionableEventsConfig>(userCalendarFetchedEventSchema);
export type Event = z.infer<typeof eventSchema>;

function lambdaHandler(event: Event): Promise<void> {
  logger.info(`Processing sqs message in second lambda. Event: ${JSON.stringify(event)}`);
  return Promise.resolve();
}
export const handler = backgroundProcessingMiddleware(
  () => readActionableEventsConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
