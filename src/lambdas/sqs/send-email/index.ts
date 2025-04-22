import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { emailToBeSentEventSchema } from '@model/app-events/EmailToBeSentEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { EmailSendSuccessResponse } from '@model/vendor/mailgun';
import type { Brand } from '@notifycal/shared/types';
import { setupLoggerForEventProcessing } from '@services/common/logger';
import type { Context } from 'aws-lambda';
import type { z } from 'zod';
import { readSendEmailConfig, type SendEmailConfig } from './config';
import MessageProcessor from './message-idempotent-processor';

const body = emailToBeSentEventSchema;
const eventSchema = eventSqsSchema<SendEmailConfig, typeof body>(body);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;

export type Base64Event = Brand<string, 'Base64Event'>;

function lambdaHandler(event: Event, context: Context): Promise<EmailSendSuccessResponse> {
  logger.info(`Processing sqs message in email lambda`, { event });
  const config = event.lambdaConfig;
  const record = event.Records[0];
  setupLoggerForEventProcessing(record.body);
  logger.appendKeys({
    correlationId: record.body.correlationId,
    to: record.body.data.to,
    from: config.emailingConfig.sender,
    subject: record.body.data.subject,
    emailTags: record.body.data.tags
  });

  logger.info('Before running idempotency. Will attempt to send a message if not sent yet');
  const messageProcessor = new MessageProcessor(
    config,
    config.emailingConfig.enabled,
    config.idempotencyPersistenceConfig,
    context
  );

  return messageProcessor.sendEmailIdempotently(record.body, config.emailingConfig.sender);
}

const handler = backgroundProcessingMiddleware(
  () => readSendEmailConfig(),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
