import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { DateTime } from '@notifycal/shared/types';
import type { Context } from 'aws-lambda';
import { z } from 'zod';
import { readFetchUserCalendarsConfig, type FetchUserCalendarsConfig } from './config';

const eventSchema = eventSqsSchema<FetchUserCalendarsConfig, z.AnyZodObject>(
  z.object({}).passthrough()
);
export type Event = z.infer<typeof eventSchema>;
export interface CronRunForEvent {
  lowerBoundStartTime: DateTime;
  upperBoundStartTime: DateTime;
  slidingWindowInMinutes: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function lambdaHandler(event: Event, context: Context): Promise<void> {
  logger.info(`Processing sqs message in fetch user calendars lambda`, { event });

  return Promise.resolve();
}
export const handler = backgroundProcessingMiddleware(
  () => readFetchUserCalendarsConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
