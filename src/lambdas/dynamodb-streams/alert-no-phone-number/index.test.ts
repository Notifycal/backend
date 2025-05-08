import { createSqsHandlerTestSuite as createBatchProcessingHandlerTestSuite } from '@lambdas/sqs/batch-processing-lambda-handler-test.suite';
import type { AwsArn } from '@own-types/model';
import { auditTrailActionableEventFoundEvent } from '@testing/data/app-events';
import { validRawRecord } from '@testing/data/dynamodb-stream-events';
import {
  setEnvAlertNoPhoneNumberBaseStoreConfig,
  setEnvEmailToBeSentTopicConfig
} from '@testing/utils/config';
import type { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { describe, vi } from 'vitest';
import type { AlertNoPhoneNumberConfig } from './config';
// @ts-expect-error cjs handler export
import { handler } from './index';
import { recordProcessor } from './record-processor';

const validActionableEventFoundEvent = auditTrailActionableEventFoundEvent;
const validDynamoDbStreamRecord: DynamoDBRecord = validRawRecord(validActionableEventFoundEvent);
const validDynamoDbStreamEvent: DynamoDBStreamEvent = {
  Records: [validDynamoDbStreamRecord]
};

function setEnv() {
  const config: AlertNoPhoneNumberConfig = {
    alertNoPhoneNumberBaseStoreConfig: {
      tableName: 'some-table-name'
    },
    emailToBeSentTopicConfig: {
      topicArn: 'some-arn' as AwsArn
    }
  };
  setEnvAlertNoPhoneNumberBaseStoreConfig(config.alertNoPhoneNumberBaseStoreConfig);
  setEnvEmailToBeSentTopicConfig(config.emailToBeSentTopicConfig);
}

vi.mock('./record-processor');

describe(
  // eslint-disable-next-line vitest/valid-describe-callback
  'Alert No Phone Number',
  createBatchProcessingHandlerTestSuite({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    handler,
    setEnv,
    validBatchEvent: validDynamoDbStreamEvent,
    recordProcessorMockFn: () => vi.mocked(recordProcessor)
  })
);
