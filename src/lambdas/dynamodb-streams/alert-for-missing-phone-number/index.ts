import { BatchProcessor, EventType, processPartialResponse } from '@aws-lambda-powertools/batch';
import type { PartialItemFailureResponse } from '@aws-lambda-powertools/batch/types';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { setupLoggerForAuditStoreRecordProcessing } from '@services/common/logger';
import { SnsService } from '@services/sns';
import { AlertsBaseStore } from '@services/stores/alerts-base-store';
import { UserBaseStore } from '@services/stores/user-base-store';
import type { Context } from 'aws-lambda';
import {
  readAlertForMissingPhoneNumberConfig,
  type AlertForMissingPhoneNumberConfig
} from './config';
import { recordProcessor } from './record-processor';
import { eventSchema, type Event, type Record } from './schema';

export function recordProcessorCurried(
  config: AlertForMissingPhoneNumberConfig
): (record: Record) => Promise<void> {
  return (record: Record) => {
    const _logger = logger.createChild();
    setupLoggerForAuditStoreRecordProcessing(record.dynamodb.NewImage);
    const alertsBaseStore = AlertsBaseStore.withConfig(config.alertsBaseStoreConfig, _logger);
    const userBaseStore = UserBaseStore.withConfig(config.userBaseStoreConfig, _logger);
    const snsService = SnsService.withConfig(config.emailToBeSentTopicConfig, _logger);
    return recordProcessor(
      record.dynamodb.NewImage,
      {
        alertThresholdConfig: config.alertThresholdConfig,
        emailingSenderConfig: config.emailingSenderConfig,
        alertEmailConfig: config.alertEmailConfig
      },
      alertsBaseStore,
      userBaseStore,
      snsService,
      _logger
    );
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function lambdaHandler(event: Event, context: Context): Promise<PartialItemFailureResponse> {
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
  () => readAlertForMissingPhoneNumberConfig(),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
