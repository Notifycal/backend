import { createSqsHandlerTestSuite } from '@lambdas/batch-processing-lambda-handler-test.suite';
import { validStripeCheckoutSessionCompletedEvent } from '@testing/data/event-bridge-event';
import { validRawRecord } from '@testing/data/sqs-events';
import { setEnvUserBaseStoreConfig } from '@testing/utils/config';
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
    paymentPlans: {
      tiers: {
        good: {
          id: 'good',
          priceId: 'wsdrvwefg'
        },
        better: {
          id: 'better',
          priceId: 'wsdrvwefg'
        },
        best: {
          id: 'best',
          priceId: 'wsdrvwefg'
        }
      }
    }
  };
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
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
