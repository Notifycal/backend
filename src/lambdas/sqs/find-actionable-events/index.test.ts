import type { AwsArn } from '@own-types/model';
import { userCalendarFetchedEvent } from '@testing/data/app-events';
import { validRawRecord } from '@testing/data/sqs-events';
import {
  fakeIdpConfigs,
  setEnvActionableEventFoundTopicConfig,
  setEnvIdpConfigs
} from '@testing/utils/config';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { describe, vi } from 'vitest';
import { createSqsHandlerTestSuite } from '../batch-processing-lambda-handler-test.suite';
import type { ActionableEventsConfig } from './config';
// @ts-expect-error cjs handler export
import { handler } from './index';
import { recordProcessor } from './record-processor';

const validUserCalendarFetchedEvent = userCalendarFetchedEvent;
const validSqsRecord: SQSRecord = validRawRecord(validUserCalendarFetchedEvent);
const validSqsBatchEvent: SQSEvent = {
  Records: [validSqsRecord]
};

function setEnv(): void {
  const config: ActionableEventsConfig = {
    actionableEventFoundTopicConfig: {
      topicArn: 'someTopicArn' as AwsArn
    },
    idpConfigs: fakeIdpConfigs
  };
  setEnvActionableEventFoundTopicConfig(config.actionableEventFoundTopicConfig);
  setEnvIdpConfigs(config.idpConfigs);
}

vi.mock('./record-processor');

describe(
  // eslint-disable-next-line vitest/valid-describe-callback
  'Find actionable events',
  createSqsHandlerTestSuite({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    handler,
    setEnv,
    validBatchEvent: validSqsBatchEvent,
    recordProcessorMockFn: () => vi.mocked(recordProcessor)
  })
);
