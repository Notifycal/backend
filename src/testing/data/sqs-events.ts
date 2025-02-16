import type { BaseEvent } from '@model/app-events/BaseEvent';
import type { SQSMessageAttributes, SQSRecordAttributes } from 'aws-lambda';

export interface TestingSQSRecord<TRecord> {
  messageId: string;
  receiptHandle: string;
  body: TRecord;
  attributes: SQSRecordAttributes;
  messageAttributes: SQSMessageAttributes;
  md5OfBody: string;
  md5OfMessageAttributes?: string;
  eventSource: 'aws:sqs';
  eventSourceARN: string;
  awsRegion: string;
}
export interface TestingSQSEvent<TRecord> {
  Records: Array<TestingSQSRecord<TRecord>>;
}
const recordBodyOmitted: Omit<TestingSQSRecord<unknown>, 'body'> = {
  messageId: 'some message id',
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
export function validRecord<TRecord extends BaseEvent>(event: TRecord): TestingSQSRecord<TRecord> {
  return {
    body: event,
    ...recordBodyOmitted
  };
}
export function validRawRecord<TRecord extends BaseEvent>(
  event: TRecord
): TestingSQSRecord<string> {
  return {
    body: JSON.stringify(event),
    ...recordBodyOmitted
  };
}
