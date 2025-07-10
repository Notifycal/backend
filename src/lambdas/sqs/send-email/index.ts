import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { emailToBeSentEventSchema } from '@model/app-events/EmailToBeSentEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { EmailSendSuccessResponse } from '@model/vendor/mailgun/schemas';
import type { Brand } from '@notifycal/shared/types';
import { setupLoggerForEventProcessing } from '@services/common/logger';
import { SnsService } from '@services/sns';
import type { Context } from 'aws-lambda';
import type { z } from 'zod';
import { readSendEmailConfig, type SendEmailConfig } from './config';
import { IdempotentProcessor } from './idempotent-processor';

const body = emailToBeSentEventSchema;
const eventSchema = eventSqsSchema<SendEmailConfig, typeof body>(body);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;

export type Base64Event = Brand<string, 'Base64Event'>;

function setupLogger(record: Record): void {
  setupLoggerForEventProcessing(record.body);
  logger.appendKeys({
    correlationId: record.body.correlationId,
    to: record.body.data.to,
    from: record.body.data.from,
    subject: record.body.data.subject,
    emailTags: record.body.data.tags
  });
}

function lambdaHandler(event: Event, context: Context): Promise<EmailSendSuccessResponse> {
  const config = event.lambdaConfig;
  const record = event.Records[0];
  if (!record) {
    return Promise.reject(new Error('No record found in event'));
  }
  setupLogger(record);
  const snsService = SnsService.withConfig(config.emailingTopicConfig, logger);
  const messageProcessor = new IdempotentProcessor(
    config,
    config.idempotencyPersistenceConfig,
    config.emailingConfig.enabled,
    context,
    snsService,
    logger
  );

  return messageProcessor.sendEmailIdempotently(record.body);
}

const handler = backgroundProcessingMiddleware(readSendEmailConfig, eventSchema).handler<Event>(
  lambdaHandler
);

module.exports = { handler };
