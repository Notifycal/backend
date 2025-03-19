import type { JSONValue } from '@aws-lambda-powertools/commons/types';
import { IdempotencyConfig, makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger, metrics } from '@common/powertools';
import {
  type ActionableEventFoundEvent,
  actionableEventFoundEventSchema
} from '@model/app-events/ActionableEventFoundEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { Uuid } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { objectToQueryString } from '@utils/queryString';
import type { Context } from 'aws-lambda';
import type { z } from 'zod';
import { readSendEventReminderConfig, type SendEventReminderConfig } from './config';
import MessageProcessor from './message-idempotent-processor';
import { AuditTrailService } from '@services/audit-trail';
import type { CalendarEventReminderAttemptFailedEvent } from '@model/app-events/CalendarEventReminderAttemptFailedEvent';
import { MetricUnit } from '@aws-lambda-powertools/metrics';

const eventSchema = eventSqsSchema<SendEventReminderConfig, typeof actionableEventFoundEventSchema>(
  actionableEventFoundEventSchema
);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;

// eslint-disable-next-line prefer-const
let ssmParameterObj: { ssmParameter?: string } = {};

async function lambdaHandler(event: Event, context: Context): Promise<Uuid | null> {
  logger.info(`Processing sqs message in third lambda. Event: ${JSON.stringify(event)}`);

  let isIdempotencyHit = false;

  const config = event.lambdaConfig;
  const record = event.Records[0];

  if (!record.body.data.receiverDetails.identifier.startsWith('+34')) {
    logger.warn('Not sending event reminder because the number does not start with +34', {
      record
    });

    metrics.addMetric('MessageNotSentOutsideOfSpain', MetricUnit.Count, 1);
    metrics.addMetadata('correlationId', record.body.correlationId);
    metrics.addMetadata('eventId', record.body.eventId);

    return null;
  }

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

  const queryStringEventData: Omit<
    ActionableEventFoundEvent,
    'eventType' | 'eventId' | 'happenedAt'
  > = {
    correlationId: record.body.correlationId,
    userId: record.body.userId,
    idp: record.body.idp,
    idpId: record.body.idpId,
    data: record.body.data
  };

  const recordQs = objectToQueryString(queryStringEventData);
  const webhookURL = `${config.vonageConfig.webhookBaseURL}?${recordQs}` as Url;

  logger.info('Body', { body: record.body });
  logger.info('FullWebhookUrl', { webhookURL });

  let messageUUID;

  try {
    messageUUID = await messageProcessorIdempotent(record, webhookURL);
  } catch (err) {
    const auditTrailService = AuditTrailService.withConfig(config.auditTrailQueueConfig);
    await auditTrailService.send<CalendarEventReminderAttemptFailedEvent>({
      ...record.body,
      eventType: 'CalendarEventReminderAttemptFailed'
    });

    throw err;
  }

  if (isIdempotencyHit) {
    await messageProcessor.onIdempotencyHit(record, messageUUID);
  }

  return messageUUID;
}

export const handler = backgroundProcessingMiddleware(
  () => readSendEventReminderConfig(ssmParameterObj),
  eventSchema
).handler<Event>(lambdaHandler);
