import { createSqsHandlerTestSuite as createBatchProcessingHandlerTestSuite } from '@lambdas/batch-processing-lambda-handler-test.suite';
import type { Email } from '@notifycal/shared/types';
import type { AwsArn } from '@own-types/model';
import {
  insufficientCreditsReminderNotSentEvent,
  lowCreditsDetectedEvent
} from '@testing/data/app-events';
import { validRawRecord } from '@testing/data/dynamodb-stream-events';
import { setEnvEmailingSenderConfig, setEnvEmailToBeSentTopicConfig } from '@testing/utils/config';
import type { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { describe, vi } from 'vitest';
import type { AlertForEventsConfig } from './config';
// @ts-expect-error cjs handler export
import { handler } from './index';
import { recordProcessor } from './record-processor';

const validLowCreditsDetectedEvent = lowCreditsDetectedEvent;
const validDynamoDbStreamRecord1: DynamoDBRecord = validRawRecord(validLowCreditsDetectedEvent);

const validInsufficientCreditsReminderNotSentEvent = insufficientCreditsReminderNotSentEvent;
const validDynamoDbStreamRecord2: DynamoDBRecord = validRawRecord(
  validInsufficientCreditsReminderNotSentEvent
);
const validDynamoDbStreamEvent: DynamoDBStreamEvent = {
  Records: [validDynamoDbStreamRecord1, validDynamoDbStreamRecord2]
};

function setEnv() {
  const config: AlertForEventsConfig = {
    emailToBeSentTopicConfig: {
      topicArn: 'some-arn' as AwsArn
    },
    emailingSenderConfig: {
      sender: {
        name: 'Notifycal',
        email: 'some@email.com' as Email
      }
    }
  };
  setEnvEmailToBeSentTopicConfig(config.emailToBeSentTopicConfig);
  setEnvEmailingSenderConfig(config.emailingSenderConfig);
}

vi.mock('./record-processor');

describe(
  // eslint-disable-next-line vitest/valid-describe-callback
  'Alert For Events',
  createBatchProcessingHandlerTestSuite({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    handler,
    setEnv,
    validBatchEvent: validDynamoDbStreamEvent,
    recordProcessorMockFn: () => vi.mocked(recordProcessor)
  })
);
