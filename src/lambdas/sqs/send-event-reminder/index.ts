import type { JSONValue } from '@aws-lambda-powertools/commons/types';
import { IdempotencyConfig, makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { Uuid } from '@notifycal/shared/types';
import type { Context } from 'aws-lambda';
import type { z } from 'zod';
import { readSendEventReminderConfig, type SendEventReminderConfig } from './config';
import MessageProcessor from './message-idempotent-processor';

import { objectToQueryString } from '@utils/queryString';

const eventSchema = eventSqsSchema<SendEventReminderConfig, typeof actionableEventFoundEventSchema>(
  actionableEventFoundEventSchema
);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;

// eslint-disable-next-line prefer-const
let ssmParameterObj: { ssmParameter?: string } = {};

async function lambdaHandler(event: Event, context: Context): Promise<Uuid> {
  logger.info(`Processing sqs message in third lambda. Event: ${JSON.stringify(event)}`);

  let isIdempotencyHit = false;

  const config = event.lambdaConfig;
  const record = event.Records[0];

  const messageProcessor = new MessageProcessor(config);
  const idempotencyConfig = new IdempotencyConfig({
    eventKeyJmesPath: '[body.data.message, body.data.senderDetails, body.data.receiverDetails]',
    expiresAfterSeconds: 86400,
    throwOnNoIdempotencyKey: true,
    responseHook: (messageUUIDResponse): JSONValue => {
      isIdempotencyHit = true;

      return messageUUIDResponse;
    }
  });
  idempotencyConfig.registerLambdaContext(context);

  const idempotencyPersistence = new DynamoDBPersistenceLayer(config.idempotencyPersistenceConfig);

  logger.info('Before running idempotency. Will attempt to send a message if not sent yet');
  const messageProcessorIdempotent = makeIdempotent(messageProcessor.sendReminder, {
    dataIndexArgument: 0, // Which argument will be used as a PK for idempotency in the store
    persistenceStore: idempotencyPersistence,
    config: idempotencyConfig
  });


  /*
  - new eventId? (uuid)
  - keep correlationId (uuid)
  - eventType?
  - set happenedAt?
  - keep userId
  - keep idp, idpId?
  - data:
    - keep run
    - keep calendar
    - keep calendar event (id only, or everything?)
    - keep senderDetails and receiverDetails
  */
  const recordQs = objectToQueryString(record.body);
  const fullURL = `${config.vonageConfig.webhookBaseURL}?${recordQs}`;

  logger.info(`recordBody: ${JSON.stringify(record.body, null, 2)}`);
  logger.info(`fullWebhookUrl: ${fullURL}`);

  const messageUUID = await messageProcessorIdempotent(record);

  if (isIdempotencyHit) {
    await messageProcessor.onIdempotencyHit(record, messageUUID);
  }

  return messageUUID;
}

export const handler = backgroundProcessingMiddleware(
  () => readSendEventReminderConfig(ssmParameterObj),
  eventSchema
).handler<Event>(lambdaHandler);
