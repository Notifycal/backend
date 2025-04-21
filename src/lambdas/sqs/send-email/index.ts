import type { JSONValue } from '@aws-lambda-powertools/commons/types';
import { IdempotencyConfig, makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import type { DynamoDBPersistenceOptions } from '@aws-lambda-powertools/idempotency/dynamodb/types';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import type { EmailWithName } from '@model/app-events/common';
import type { EmailToBeSentAttemptFailedEvent } from '@model/app-events/EmailToBeSentAttemptFailedEvent';
import {
  type EmailToBeSentEvent,
  emailToBeSentEventSchema
} from '@model/app-events/EmailToBeSentEvent';
import type { EmailingTopicConfig } from '@model/Config';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { EmailSendSuccessResponse } from '@model/vendor/mailgun';
import type { Brand } from '@notifycal/shared/types';
import { setupLoggerForEventProcessing } from '@services/common/logger';
import { SnsService } from '@services/sns';
import type { Context } from 'aws-lambda';
import type { z } from 'zod';
import { readSendEmailConfig, type SendEmailConfig } from './config';
import MessageProcessor from './message-idempotent-processor';

const body = emailToBeSentEventSchema;
const eventSchema = eventSqsSchema<SendEmailConfig, typeof body>(body);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;

export type Base64Event = Brand<string, 'Base64Event'>;

function buildSendEmailIdempotentlyFn(
  processor: MessageProcessor,
  config: DynamoDBPersistenceOptions,
  responseHook: (messageUUIDResponse: JSONValue) => JSONValue,
  context: Context
): (
  event: EmailToBeSentEvent,
  from: EmailWithName,
  tags: Array<string>
) => Promise<EmailSendSuccessResponse> {
  const idempotencyConfig = new IdempotencyConfig({
    eventKeyJmesPath: '[body.data.htmlBody, body.data.to, body.data.subject]', //TODO double check this cause it a fragile bit of code
    expiresAfterSeconds: 86400,
    throwOnNoIdempotencyKey: true,
    responseHook: responseHook
  });
  idempotencyConfig.registerLambdaContext(context);

  const idempotencyPersistence = new DynamoDBPersistenceLayer(config);
  return makeIdempotent<
    (
      event: EmailToBeSentEvent,
      from: EmailWithName,
      tags: Array<string>
    ) => Promise<EmailSendSuccessResponse>
  >((event, from, tags) => processor.sendEmail(event, from, tags), {
    dataIndexArgument: 0, // Which argument will be used as a PK for idempotency in the store //TODO double check this cause it a fragile bit of code
    persistenceStore: idempotencyPersistence,
    config: idempotencyConfig
  });
}

async function handleReminderAttemptFailure(
  event: EmailToBeSentEvent,
  config: EmailingTopicConfig['emailingTopicConfig']
): Promise<void> {
  const snsService = SnsService.withConfig(config);
  const errorEvent: EmailToBeSentAttemptFailedEvent = {
    ...event,
    eventType: 'EmailToBeSentAttemptFailed' as const
  };
  await snsService.safePublish(errorEvent);
}

async function sendEmailIdempotently(
  event: EmailToBeSentEvent,
  config: SendEmailConfig,
  sendEmailIdempotentlyFn: (
    event: EmailToBeSentEvent,
    sender: EmailWithName,
    tags: Array<string>
  ) => Promise<EmailSendSuccessResponse>,
  isIdempotencyHit: boolean,
  messageProcessor: MessageProcessor
): Promise<EmailSendSuccessResponse> {
  let sendResponse: EmailSendSuccessResponse;
  try {
    sendResponse = await sendEmailIdempotentlyFn(
      event,
      config.emailingConfig.sender,
      event.data.tags //TODO check this out. Code smell,
    );
  } catch (err) {
    await handleReminderAttemptFailure(event, config.emailingTopicConfig);
    throw err;
  }
  if (isIdempotencyHit) {
    await messageProcessor.onIdempotencyHit(event, sendResponse);
  }
  return sendResponse;
}

function lambdaHandler(event: Event, context: Context): Promise<EmailSendSuccessResponse> {
  logger.info(`Processing sqs message in email lambda`, { event });
  const config = event.lambdaConfig;
  const record = event.Records[0];
  setupLoggerForEventProcessing(record.body);
  logger.appendKeys({
    correlationId: record.body.correlationId,
    to: record.body.data.to.email,
    emailTags: record.body.data.tags
  });

  logger.info('Before running idempotency. Will attempt to send a message if not sent yet');
  const messageProcessor = new MessageProcessor(config);
  let isIdempotencyHit = false;
  const sendMessageIdempotentlyFn = buildSendEmailIdempotentlyFn(
    messageProcessor,
    config.idempotencyPersistenceConfig,
    (messageUUIDResponse: JSONValue) => {
      isIdempotencyHit = true;
      return messageUUIDResponse;
    },
    context
  );

  return sendEmailIdempotently(
    record.body,
    config,
    sendMessageIdempotentlyFn,
    isIdempotencyHit,
    messageProcessor
  );
}

const handler = backgroundProcessingMiddleware(
  () => readSendEmailConfig(),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
