import type { AwsArn, Url } from '@own-types/model';
import { userCalendarFetchedEvent } from '@testing/data/app-events';
import { validRawRecord } from '@testing/data/sqs-events';
import {
  fakeIdpConfigs,
  setEnvActionableEventFoundTopicConfig,
  setEnvAuditTrailQueueConfig,
  setEnvDeadLetterQueueConfig,
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
    deadLetterQueueConfig: {
      queueUrl: 'http://aws.com/dql' as Url
    },
    auditTrailQueueConfig: {
      queueUrl: 'https://fake-queue-url' as Url
    },
    idpConfigs: fakeIdpConfigs
  };
  setEnvActionableEventFoundTopicConfig(config.actionableEventFoundTopicConfig);
  setEnvDeadLetterQueueConfig(config.deadLetterQueueConfig);
  setEnvAuditTrailQueueConfig(config.auditTrailQueueConfig);
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
