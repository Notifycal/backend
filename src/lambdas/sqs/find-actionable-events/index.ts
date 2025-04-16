import { BatchProcessor, EventType, processPartialResponse } from '@aws-lambda-powertools/batch';
import type { PartialItemFailureResponse } from '@aws-lambda-powertools/batch/types';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { setupLoggerForEventProcessing } from '@services/common/logger';
import type { Context } from 'aws-lambda';
import { readActionableEventsConfig, type ActionableEventsConfig } from './config';
import { recordProcessor } from './record-processor';
import { eventSchema, type Event, type Record } from './schema';

export function recordProcessorCurried(
  config: ActionableEventsConfig
): (record: Record) => Promise<void> {
  return (record: Record) => {
    const _logger = logger.createChild();
    setupLoggerForEventProcessing(record.body, _logger);
    _logger.appendKeys({
      run: record.body.data.run
    });
    return recordProcessor(record, config);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function lambdaHandler(event: Event, context: Context): Promise<PartialItemFailureResponse> {
  logger.info(`Processing sqs message in second lambda`, { event });
  return processPartialResponse(
    event,
    recordProcessorCurried(event.lambdaConfig),
    new BatchProcessor(EventType.SQS)
  ).catch((error) => {
    logger.error(`Failed to process event.`, { error });
    throw error;
  });
}
const handler = backgroundProcessingMiddleware(
  () => readActionableEventsConfig(),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
