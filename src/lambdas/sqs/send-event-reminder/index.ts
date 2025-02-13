import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { z } from 'zod';
import { readSendEventReminderConfig, type SendEventReminderConfig } from './config';
import type { Context } from 'aws-lambda';

const eventSchema = eventSqsSchema<SendEventReminderConfig, typeof actionableEventFoundEventSchema>(
  actionableEventFoundEventSchema
);
export type Event = z.infer<typeof eventSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function lambdaHandler(event: Event, context: Context): Promise<void> {
  logger.info(`Processing sqs message in third lambda. Event: ${JSON.stringify(event)}`);
  return Promise.resolve();
}

export const handler = backgroundProcessingMiddleware(
  () => readSendEventReminderConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
