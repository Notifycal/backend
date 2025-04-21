import type { JSONValue } from '@aws-lambda-powertools/commons/types';
import { IdempotencyConfig, makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import type { DynamoDBPersistenceOptions } from '@aws-lambda-powertools/idempotency/dynamodb/types';
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger, metrics } from '@common/powertools';
import {
  type ActionableEventFoundEvent,
  actionableEventFoundEventSchema
} from '@model/app-events/ActionableEventFoundEvent';
import type { ActionableEventReminderAttemptFailedEvent } from '@model/app-events/ActionableEventReminderAttemptFailedEvent';
import type { DemoReminderToBeSentAttemptFailedEvent } from '@model/app-events/DemoReminderToBeSentAttemptFailedEvent';
import {
  type DemoReminderToBeSentEvent,
  demoReminderToBeSentEventSchema
} from '@model/app-events/DemoReminderToBeSentEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { Uuid } from '@notifycal/shared/types';
import type { PhoneNumberE164, Url } from '@own-types/model';
import { setupLoggerForEventProcessing } from '@services/common/logger';
import { SnsService } from '@services/sns';
import { tap } from '@utils/promises';
import { objectToQueryString } from '@utils/queryString';
import type { Context } from 'aws-lambda';
import { match } from 'ts-pattern';
import { z } from 'zod';
import { readSendEventReminderConfig, type SendEventReminderConfig } from './config';
import MessageProcessor from './message-idempotent-processor';

const bodies = z.union([actionableEventFoundEventSchema, demoReminderToBeSentEventSchema]);
const eventSchema = eventSqsSchema<SendEventReminderConfig, typeof bodies>(bodies);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;

// eslint-disable-next-line prefer-const
let ssmCache: { vonagePrivateKey?: string } = {};

function nonSpanishPhoneReceiverHandler(record: Record): 'MessageNotSentOutsideOfSpain' {
  logger.warn('Not sending event reminder because the number does not start with +34', {
    record
  });
  metrics.addMetric(
    'MessageNotSentOutsideOfSpain',
    MetricUnit.Count,
    1,
    {},
    {
      correlationId: record.body.correlationId,
      eventId: record.body.eventId
    }
  );
  return 'MessageNotSentOutsideOfSpain';
}

function isSpanishPhoneNumber(number: PhoneNumberE164): boolean {
  return number.startsWith('+34');
}

function buildWebhookUrl(record: Record, baseWebhookUrl: Url): Url {
  const queryStringEventData: Omit<
    ActionableEventFoundEvent | DemoReminderToBeSentEvent,
    'eventId' | 'happenedAt'
  > = {
    eventType: record.body.eventType,
    correlationId: record.body.correlationId,
    userId: record.body.userId,
    idp: record.body.idp,
    idpId: record.body.idpId,
    data: record.body.data
  };
  const recordQs = objectToQueryString(queryStringEventData);
  const webhookUrl = `${baseWebhookUrl}?${recordQs}` as Url;
  logger.info('Body', { body: record.body });
  logger.info('FullWebhookUrl', { webhookUrl });
  return webhookUrl;
}

function buildSendMessageIdempotentlyFn(
  processor: MessageProcessor,
  config: DynamoDBPersistenceOptions,
  responseHook: (messageUUIDResponse: JSONValue) => JSONValue,
  context: Context
): (record: Record, webhookUrl: Url) => Promise<Uuid> {
  const idempotencyConfig = new IdempotencyConfig({
    eventKeyJmesPath: '[body.data.message, body.data.senderDetails, body.data.receiverDetails]',
    expiresAfterSeconds: 86400,
    throwOnNoIdempotencyKey: true,
    responseHook: responseHook
  });
  idempotencyConfig.registerLambdaContext(context);

  const idempotencyPersistence = new DynamoDBPersistenceLayer(config);
  return makeIdempotent(
    (record: Record, webhookUrl: Url) => processor.sendReminder(record, webhookUrl),
    {
      dataIndexArgument: 0, // Which argument will be used as a PK for idempotency in the store
      persistenceStore: idempotencyPersistence,
      config: idempotencyConfig
    }
  );
}

async function handleReminderAttemptFailure(
  record: Record,
  config: SendEventReminderConfig['messagingTopicConfig']
): Promise<void> {
  const snsService = SnsService.withConfig(config);
  const errorEvent = match(record.body)
    .with({ eventType: 'ActionableEventFound' }, (b) => ({
      ...b,
      eventType: 'ActionableEventReminderAttemptFailed' as const
    }))
    .with({ eventType: 'DemoReminderToBeSent' }, (b) => ({
      ...b,
      eventType: 'DemoReminderToBeSentAttemptFailed' as const
    }))
    .exhaustive();
  await snsService.safePublish<
    ActionableEventReminderAttemptFailedEvent | DemoReminderToBeSentAttemptFailedEvent
  >(errorEvent);
}

async function sendMessageIdempotently(
  record: Record,
  config: SendEventReminderConfig,
  sendMessageIdempotentlyFn: (record: Record, webhookUrl: Url) => Promise<Uuid>,
  isIdempotencyHit: boolean,
  messageProcessor: MessageProcessor
): Promise<Uuid> {
  const webhookURL = buildWebhookUrl(record, config.vonageConfig.webhookBaseURL);
  return sendMessageIdempotentlyFn(record, webhookURL).then(
    tap(async (messageUUID) => {
      if (isIdempotencyHit) {
        await messageProcessor.onIdempotencyHit(record, messageUUID);
      }
    }),
    async (err) => {
      await handleReminderAttemptFailure(record, config.messagingTopicConfig);
      throw err;
    }
  );
}

async function lambdaHandler(
  event: Event,
  context: Context
): Promise<Uuid | 'MessageNotSentOutsideOfSpain'> {
  logger.info(`Processing sqs message in third lambda`, { event });
  const config = event.lambdaConfig;
  const record = event.Records[0];
  setupLoggerForEventProcessing(record.body);
  logger.appendKeys({
    ...('run' in record.body.data ? { run: record.body.data.run } : {}),
    correlationId: record.body.correlationId
  });
  if (!isSpanishPhoneNumber(record.body.data.receiverDetails.phoneNumber)) {
    return nonSpanishPhoneReceiverHandler(record);
  }

  logger.info('Before running idempotency. Will attempt to send a message if not sent yet');
  const messageProcessor = new MessageProcessor(config);
  let isIdempotencyHit = false;
  const sendMessageIdempotentlyFn = buildSendMessageIdempotentlyFn(
    messageProcessor,
    config.idempotencyPersistenceConfig,
    (messageUUIDResponse: JSONValue) => {
      isIdempotencyHit = true;
      return messageUUIDResponse;
    },
    context
  );

  return sendMessageIdempotently(
    record,
    config,
    sendMessageIdempotentlyFn,
    isIdempotencyHit,
    messageProcessor
  );
}

const handler = backgroundProcessingMiddleware(
  () => readSendEventReminderConfig(ssmCache),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
