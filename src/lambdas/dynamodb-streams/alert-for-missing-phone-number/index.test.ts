import { createSqsHandlerTestSuite as createBatchProcessingHandlerTestSuite } from '@lambdas/batch-processing-lambda-handler-test.suite';
import type { Email } from '@notifycal/shared/types';
import type { AwsArn } from '@own-types/model';
import {
  auditTrailActionableEventFoundEvent,
  auditTrailNoPhoneNumberForCalendarEventFoundEvent
} from '@testing/data/app-events';
import { validRawRecord } from '@testing/data/dynamodb-stream-events';
import {
  setEnvAlertEmailConfig,
  setEnvAlertsBaseStoreConfig,
  setEnvAlertThresholdConfig,
  setEnvEmailingSenderConfig,
  setEnvEmailToBeSentTopicConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
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
    userBaseStoreConfig: {
      tableName: 'Users-local'
    },
    emailToBeSentTopicConfig: {
      topicArn: 'some-arn' as AwsArn
    },
    alertThresholdConfig: {
      errorRateThreshold: 5,
      maxNotificationsPerDay: 1,
      countThresholdToEnableTrigger: 10
    },
    emailingSenderConfig: {
      sender: {
        name: 'Notifycal',
        email: 'some@email.com' as Email
      }
    },
    alertEmailConfig: {
      faqUrl: new URL('https://some.faq.url'),
      billingUrl: new URL('https://some.faq.pricing')
    }
  };
  setEnvAlertsBaseStoreConfig(config.alertsBaseStoreConfig);
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
  setEnvEmailToBeSentTopicConfig(config.emailToBeSentTopicConfig);
  setEnvAlertThresholdConfig(config.alertThresholdConfig);
  setEnvEmailingSenderConfig(config.emailingSenderConfig);
  setEnvAlertEmailConfig(config.alertEmailConfig);
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
