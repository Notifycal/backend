import { userCalendarFetchedEvent } from '@testing/data/app-events';
import { validRawRecord } from '@testing/data/sqs-events';
import {
  setEnvAuditTrailBaseStoreConfig,
  setEnvAuditTrailRecordExpiresAtConfig
} from '@testing/utils/config';
import type { Context, SQSEvent, SQSRecord } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { type Event, handler } from '.';
import type { AuditTrailConfig } from './config';
import * as recordProcessor from './record-processor';

const defaultConfig: AuditTrailConfig = {
  auditTrailBaseStoreConfig: {
    tableName: 'some-table-name'
  },
  recordExpiresAtConfig: {
    expiresAtInDays: 7
  }
};
const validUserCalendarFetchedEvent = userCalendarFetchedEvent;
const validSqsRecord: SQSRecord = validRawRecord(validUserCalendarFetchedEvent);
const validSqsBatchEvent: SQSEvent = {
  Records: [validSqsRecord]
};

describe('Audit trail', () => {
  it('should parse config and events', () => {
    vi.spyOn(recordProcessor, 'recordProcessor').mockResolvedValue();
    return testit(validSqsBatchEvent).then((r) => {
      expect(r).toStrictEqual({
        batchItemFailures: []
      });
    });
  });

  it('should indicate partial failure in response', () => {
    const processorSpy = vi
      .spyOn(recordProcessor, 'recordProcessor')
      .mockResolvedValueOnce()
      .mockImplementation(() => {
        throw new Error('Boom!');
      });
    const eventError: SQSRecord = { ...validSqsRecord, messageId: 'messageWithErrorId' };
    const validInput: SQSEvent = {
      Records: [validSqsRecord, eventError]
    };
    return testit(validInput).then((r) => {
      expect(processorSpy).toHaveBeenCalledTimes(2);
      expect(r).toStrictEqual({
        batchItemFailures: [{ itemIdentifier: eventError.messageId }]
      });
    });
  });

  it('should throw an error if processing of every item fails', () => {
    vi.spyOn(recordProcessor, 'recordProcessor').mockRejectedValue(new Error('Boom!'));
    return expect(testit(validSqsBatchEvent)).rejects.toThrow(
      'All records failed processing. See individual errors below.'
    );
  });

  it('should fail to parse an event', () => {
    const invalidEvent = { Records: [{ someField: 'someValue' }] };
    return expect(
      testit(invalidEvent as unknown as SQSEvent)
    ).toRejectWithErrorContainingMessageParts([
      'Lambda payload does not satisfy the schema. Error: Failed to parse schema. This error was caused by:'
    ]);
  });
});

function testit(event: SQSEvent, config: AuditTrailConfig = defaultConfig): Promise<void> {
  setEnv(config);
  return handler(event as unknown as Event, {} as Context);
}

function setEnv(config: AuditTrailConfig) {
  setEnvAuditTrailBaseStoreConfig(config.auditTrailBaseStoreConfig);
  setEnvAuditTrailRecordExpiresAtConfig(config.recordExpiresAtConfig);
}
