import { createSqsHandlerTestSuite } from '@lambdas/batch-processing-lambda-handler-test.suite';
import type { AwsArn } from '@own-types/model';
import { validPaymentPlans } from '@testing/data/pricing';
import { validRawRecord } from '@testing/data/sqs-events';
import { validStripeCheckoutSessionCompletedEvent } from '@testing/data/stripe-event-bridge-event';
import {
  setEnvPaymentPlansConfig,
  setEnvPaymentWebhookTopicConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { describe, vi } from 'vitest';
import type { StripeWebhookConfig } from './config';
// @ts-expect-error cjs handler export
import { handler } from './index';
import { recordProcessor } from './record-processor';

const validSqsRecord: SQSRecord = validRawRecord(validStripeCheckoutSessionCompletedEvent);
const validSqsBatchEvent: SQSEvent = {
  Records: [validSqsRecord]
};

function setEnv(): void {
  const config: StripeWebhookConfig = {
    userBaseStoreConfig: {
      tableName: 'Users-local'
    },
    paymentPlans: validPaymentPlans,
    paymentWebhookTopicConfig: {
      topicArn: 'payment-webhook-topic' as AwsArn
    }
  };
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
  setEnvPaymentPlansConfig(config.paymentPlans);
  setEnvPaymentWebhookTopicConfig(config.paymentWebhookTopicConfig);
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
