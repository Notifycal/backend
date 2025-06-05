import { createSqsHandlerTestSuite } from '@lambdas/batch-processing-lambda-handler-test.suite';
import { userCalendarFetchedEvent } from '@testing/data/app-events';
import { validRawRecord } from '@testing/data/sqs-events';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { describe, vi } from 'vitest';
// @ts-expect-error cjs handler export
import { handler } from './index';
import { recordProcessor } from './record-processor';

const validUserCalendarFetchedEvent = userCalendarFetchedEvent;
const validSqsRecord: SQSRecord = validRawRecord(validUserCalendarFetchedEvent);
const validSqsBatchEvent: SQSEvent = {
  Records: [validSqsRecord]
};

function setEnv(): void {
  // const config: StripeWebhookConfig = {};
  // setEnvActionableEventFoundTopicConfig(config);
}

vi.mock('./record-processor');

describe(
  // eslint-disable-next-line vitest/valid-describe-callback
  'Stripe webhook',
  createSqsHandlerTestSuite({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    handler,
    setEnv,
    validBatchEvent: validSqsBatchEvent,
    recordProcessorMockFn: () => vi.mocked(recordProcessor)
  })
);
