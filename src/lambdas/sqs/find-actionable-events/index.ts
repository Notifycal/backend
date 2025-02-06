import { configMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { z } from 'zod';
import { readActionableEventsConfig, type ActionableEventsConfig } from './config';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const eventSchema = eventSqsSchema<ActionableEventsConfig>();
export type Event = z.infer<typeof eventSchema>;

function lambdaHandler(event: Event): Promise<void> {
  logger.info(`Processing sqs message in second lambda. Event: ${JSON.stringify(event)}`);
  return Promise.resolve();
}
export const handler = configMiddleware(() => readActionableEventsConfig(), false).handler<Event>(
  lambdaHandler
);
