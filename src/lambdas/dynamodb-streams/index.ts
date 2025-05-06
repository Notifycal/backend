import { BatchProcessor, EventType, processPartialResponse } from '@aws-lambda-powertools/batch';
import type { PartialItemFailureResponse } from '@aws-lambda-powertools/batch/types';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { SnsService } from '@services/sns';
import { AlertNoPhoneNumberBaseStore } from '@services/stores/alert-no-phone-number-store';
import type { Context } from 'aws-lambda';
import { readAlertNoPhoneNumberConfig, type AlertNoPhoneNumberConfig } from './config';
import { recordProcessor } from './record-processor';
import { eventSchema, type Event, type Record } from './schema';

export function recordProcessorCurried(
  config: AlertNoPhoneNumberConfig
): (record: Record) => Promise<void> {
  const alertNoPhoneNumberBaseStore = AlertNoPhoneNumberBaseStore.withConfig(
    config.alertNoPhoneNumberBaseStoreConfig
  );
  const snsService = SnsService.withConfig(config.emailToBeSentTopicConfig);
  return (record: Record) => recordProcessor(record, alertNoPhoneNumberBaseStore, snsService);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function lambdaHandler(event: Event, context: Context): Promise<PartialItemFailureResponse> {
  logger.info(`Processing dynamoDb stream message in alert no phone number`, { event });
  return processPartialResponse(
    event,
    recordProcessorCurried(event.lambdaConfig),
    new BatchProcessor(EventType.DynamoDBStreams)
  ).catch((error) => {
    logger.error(`Failed to process event`, { error });
    throw error;
  });
}
const handler = backgroundProcessingMiddleware(
  () => readAlertNoPhoneNumberConfig(),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
