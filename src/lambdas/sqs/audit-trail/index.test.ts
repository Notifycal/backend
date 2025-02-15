import { userCalendarFetchedEvent } from '@testing/data/app-events';
import { validRawRecord } from '@testing/data/sqs-events';
import { setEnvAuditTrailBaseStoreConfig } from '@testing/utils/config';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { describe } from 'vitest';
import { handler } from '.';
import { createSqsHandlerTestSuite } from '../sqs-lambda-handler-test.suite';
import type { AuditTrailConfig } from './config';
import * as recordProcessorModule from './record-processor';

const validUserCalendarFetchedEvent = userCalendarFetchedEvent;
const validSqsRecord: SQSRecord = validRawRecord(validUserCalendarFetchedEvent);
const validSqsBatchEvent: SQSEvent = {
  Records: [validSqsRecord]
};

function setEnv() {
  const config: AuditTrailConfig = {
    auditTrailBaseStoreConfig: {
      tableName: 'some-table-name'
    }
  };
  setEnvAuditTrailBaseStoreConfig(config.auditTrailBaseStoreConfig);
}

describe(
  // eslint-disable-next-line vitest/valid-describe-callback
  'Audit Trail',
  createSqsHandlerTestSuite({
    handler,
    setEnv,
    validSqsBatchEvent,
    recordProcessorModule
  })
);
