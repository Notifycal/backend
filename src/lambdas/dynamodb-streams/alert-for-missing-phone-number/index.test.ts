import { createSqsHandlerTestSuite as createBatchProcessingHandlerTestSuite } from '@lambdas/sqs/batch-processing-lambda-handler-test.suite';
import type { AwsArn } from '@own-types/model';
import {
  auditTrailActionableEventFoundEvent,
  auditTrailNoPhoneNumberForCalendarEventFoundEvent
} from '@testing/data/app-events';
import { validRawRecord } from '@testing/data/dynamodb-stream-events';
import { setEnvAlertsBaseStoreConfig, setEnvEmailToBeSentTopicConfig } from '@testing/utils/config';
import type { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { describe, vi } from 'vitest';
import type { AlertForMissingPhoneNumberConfig } from './config';
// @ts-expect-error cjs handler export
import { handler } from './index';
import { recordProcessor } from './record-processor';

const validActionableEventFoundEvent = auditTrailActionableEventFoundEvent;
const validDynamoDbStreamRecord1: DynamoDBRecord = validRawRecord(validActionableEventFoundEvent);
const validNoPhoneNumberForCalendarEventFoundEvent =
  auditTrailNoPhoneNumberForCalendarEventFoundEvent;
const validDynamoDbStreamRecord2: DynamoDBRecord = validRawRecord(
  validNoPhoneNumberForCalendarEventFoundEvent
);
const validDynamoDbStreamEvent: DynamoDBStreamEvent = {
  Records: [validDynamoDbStreamRecord1, validDynamoDbStreamRecord2]
};

function setEnv() {
  const config: AlertForMissingPhoneNumberConfig = {
    alertsBaseStoreConfig: {
      tableName: 'some-table-name'
    },
    emailToBeSentTopicConfig: {
      topicArn: 'some-arn' as AwsArn
    }
  };
  setEnvAlertsBaseStoreConfig(config.alertsBaseStoreConfig);
  setEnvEmailToBeSentTopicConfig(config.emailToBeSentTopicConfig);
}

vi.mock('./record-processor');

describe(
  // eslint-disable-next-line vitest/valid-describe-callback
  'Alert For Missing Phone Number',
  createBatchProcessingHandlerTestSuite({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    handler,
    setEnv,
    validBatchEvent: validDynamoDbStreamEvent,
    recordProcessorMockFn: () => vi.mocked(recordProcessor)
  })
);
