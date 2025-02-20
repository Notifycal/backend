import { IdempotencyConfig, makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { VonagePrivateKey } from '@services/messaging';
import type { Context } from 'aws-lambda';
import type { z } from 'zod';
import { readSendEventReminderConfig, type SendEventReminderConfig } from './config';
import { messageProcessor } from './message-idempotent-processor';

const eventSchema = eventSqsSchema<SendEventReminderConfig, typeof actionableEventFoundEventSchema>(
  actionableEventFoundEventSchema
);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;

// eslint-disable-next-line prefer-const
let ssmParameterObj: { ssmParameter?: string } = {};

async function lambdaHandler(event: Event, context: Context): Promise<void> {
  logger.info(`Processing sqs message in third lambda. Event: ${JSON.stringify(event)}`);

  const config = event.lambdaConfig;
  const vonagePrivateKey = ssmParameterObj.ssmParameter as VonagePrivateKey;

  const idempotencyConfig = new IdempotencyConfig({
    expiresAfterSeconds: 24 * 60 * 60 // TODO: read from config
  });

  idempotencyConfig.registerLambdaContext(context);
  const idempotencyStore = new DynamoDBPersistenceLayer(config.idempotencyConfig);

  console.log('Before running idempotency. Will attempt to send a message if not sent yet');
  const atomicOperation = makeIdempotent(messageProcessor, {
    dataIndexArgument: 0, // Declaring it for extra verbosity
    persistenceStore: idempotencyStore,
    config: idempotencyConfig
  });

  await atomicOperation(event.Records[0], config, vonagePrivateKey);
}

export const handler = backgroundProcessingMiddleware(
  () => readSendEventReminderConfig(ssmParameterObj),
  eventSchema
).handler<Event>(lambdaHandler);
