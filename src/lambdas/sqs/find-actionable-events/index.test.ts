import type { SqsEvent } from '@aws-lambda-powertools/parser/types';
import { userCalendarFetchedEvent } from '@testing/app-events';
import type { Context } from 'aws-lambda';
import type { SqsRecord } from 'node_modules/@aws-lambda-powertools/parser/lib/esm/types/schema';
import { v4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { type Event, handler } from '.';
import type { ActionableEventsConfig } from './config';
import * as recordProcessor from './record-processor';

const defaultEnv: ActionableEventsConfig = {};
const validUserCalendarFetchedEvent = userCalendarFetchedEvent;
const validSqsRecord: SqsRecord = {
  body: JSON.stringify(validUserCalendarFetchedEvent),
  messageId: v4(),
  receiptHandle: '',
  attributes: {
    ApproximateReceiveCount: '',
    ApproximateFirstReceiveTimestamp: '',
    SenderId: '',
    SentTimestamp: '',
    SequenceNumber: undefined,
    MessageDeduplicationId: undefined,
    MessageGroupId: undefined,
    AWSTraceHeader: undefined,
    DeadLetterQueueSourceArn: undefined
  },
  messageAttributes: {},
  md5OfBody: '',
  eventSource: 'aws:sqs',
  eventSourceARN: '',
  awsRegion: ''
};
const validSqsBatchEvent: SqsEvent = {
  Records: [validSqsRecord]
};

describe('Find actionable events', () => {
  it('should parse config and events', () => {
    vi.spyOn(recordProcessor, 'process').mockResolvedValue();
    return testit(validSqsBatchEvent).then((r) => {
      expect(r).toStrictEqual({
        batchItemFailures: []
      });
    });
  });

  it('should indicate partial failure in response', () => {
    const processorSpy = vi
      .spyOn(recordProcessor, 'process')
      .mockResolvedValueOnce()
      .mockImplementation(() => {
        throw new Error('Boom!');
      });
    const eventError: SqsRecord = { ...validSqsRecord, messageId: 'messageWithErrorId' };
    const validInput: SqsEvent = {
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
    vi.spyOn(recordProcessor, 'process').mockRejectedValue(new Error('Boom!'));
    return expect(testit(validSqsBatchEvent)).rejects.toThrow(
      'All records failed processing. See individual errors below.'
    );
  });

  it('should fail to parse an event', () => {
    const invalidEvent = { Records: [{ someField: 'someValue' }] };
    return expect(
      testit(invalidEvent as unknown as SqsEvent)
    ).toRejectWithErrorContainingMessageParts([
      'Lambda payload does not satisfy the schema. Error: Failed to parse schema. This error was caused by:'
    ]);
  });
});

function testit(event: SqsEvent, config: ActionableEventsConfig = defaultEnv): Promise<void> {
  setEnv(config);
  return handler(event as unknown as Event, {} as Context);
}

function setEnv(config: ActionableEventsConfig) {
  console.log(`TODO. Just to avoid errors meanwhile ${JSON.stringify(config)}`);
}
