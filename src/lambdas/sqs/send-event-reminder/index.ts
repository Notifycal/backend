import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger, metrics } from '@common/powertools';
import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { demoReminderToBeSentEventSchema } from '@model/app-events/DemoReminderToBeSentEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { Uuid } from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { setupLoggerForEventProcessing } from '@services/common/logger';
import { CreditsService } from '@services/credits-service';
import { SnsService } from '@services/sns';
import { UserBaseStore } from '@services/stores/user-base-store';
import type { Context } from 'aws-lambda';
import { z } from 'zod';
import { readSendEventReminderConfig, type SendEventReminderConfig } from './config';
import { IdempotentProcessor } from './idempotent-processor';

const bodies = z.union([actionableEventFoundEventSchema, demoReminderToBeSentEventSchema]);
const eventSchema = eventSqsSchema<SendEventReminderConfig, typeof bodies>(bodies);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;

// eslint-disable-next-line prefer-const
let ssmCache: { vonagePrivateKey?: string } = {};

function nonSpanishPhoneReceiverHandler(record: Record): Promise<'MessageNotSentOutsideOfSpain'> {
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
  return Promise.resolve('MessageNotSentOutsideOfSpain');
}

function isSpanishPhoneNumber(number: PhoneNumberE164): boolean {
  return number.startsWith('+34');
}

function lambdaHandler(
  event: Event,
  context: Context
): Promise<Uuid | 'MessageNotSentOutsideOfSpain'> {
  const config = event.lambdaConfig;
  const record = event.Records[0];
  if (!record?.body) {
    return Promise.reject(new Error('No record body found in event'));
  }
  setupLoggerForEventProcessing(record.body);
  logger.appendKeys({
    ...('run' in record.body.data ? { run: record.body.data.run } : {}),
    correlationId: record.body.correlationId
  });
  if (!isSpanishPhoneNumber(record.body.data.receiverDetails.phoneNumber)) {
    return nonSpanishPhoneReceiverHandler(record);
  }

  const snsService = SnsService.withConfig(config.messagingTopicConfig, logger);
  const userStore = UserBaseStore.withConfig(config.userBaseStoreConfig, logger);
  const creditsService = new CreditsService(userStore, logger);
  const messageProcessor = new IdempotentProcessor(
    config,
    config.idempotencyPersistenceConfig,
    config.messagingConfig.enabled,
    context,
    snsService,
    creditsService,
    logger
  );
  return messageProcessor.sendReminderIdempotently(record.body);
}

const handler = backgroundProcessingMiddleware(
  () => readSendEventReminderConfig(ssmCache),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
