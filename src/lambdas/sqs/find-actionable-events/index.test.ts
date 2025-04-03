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
import { handler } from '.';
import { createSqsHandlerTestSuite } from '../sqs-lambda-handler-test.suite';
import type { ActionableEventsConfig } from './config';
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
    handler,
    setEnv,
    validSqsBatchEvent,
    recordProcessorMockFn: () => vi.mocked(recordProcessor)
  })
);
