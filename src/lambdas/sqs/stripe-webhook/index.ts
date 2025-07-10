import { BatchProcessor, EventType, processPartialResponse } from '@aws-lambda-powertools/batch';
import type { PartialItemFailureResponse } from '@aws-lambda-powertools/batch/types';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import type { Context } from 'aws-lambda';
import { readStripeWebhookConfig, type StripeWebhookConfig } from './config';
import { defaultEventHandlers, recordProcessor } from './record-processor';
import { eventSchema, type Event, type Record } from './schema';

export function recordProcessorCurried(
  config: StripeWebhookConfig
): (record: Record) => Promise<void> {
  return (record: Record) => {
    const _logger = logger.createChild();
    const stripeEvent = record.body.detail;
    _logger.appendKeys({
      stripeEventId: stripeEvent.id,
      stripeEventType: stripeEvent.type,
      eventType: stripeEvent.type,
      livemode: stripeEvent.livemode,
      stripeApiVersion: stripeEvent.api_version
    });
    return recordProcessor(record.body, defaultEventHandlers, config, _logger);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function lambdaHandler(event: Event, _context: Context): Promise<PartialItemFailureResponse> {
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
  () => readStripeWebhookConfig(),
  eventSchema
).handler<Event>(lambdaHandler);

module.exports = { handler };
