import { logger } from '@common/powertools';
import { userCalendarFetchedEvent } from '@testing/app-events';
import type { Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { type Event, handler } from '.';
import type { ActionableEventsConfig } from './config';

const defaultEnv: ActionableEventsConfig = {};
const validUserCalendarFetchedEvent = userCalendarFetchedEvent;
const validEvent: Event = {
  lambdaConfig: defaultEnv,
  Records: [
    {
      body: JSON.stringify(validUserCalendarFetchedEvent),
      messageId: '',
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
    }
  ]
};

describe('Find actionable events', () => {
  it('should parse config and events', () => {
    const loggerSpy = vi.spyOn(logger, 'info').mockReturnValue();
    return testit(validEvent).then(() => {
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing sqs message in second lambda')
      );
    });
  });

  it('should fail to parse an event', () => {
    const invalidEvent = { ...validEvent, Records: [{ someField: 'someValue' }] };
    return expect(testit(invalidEvent as unknown as Event)).toRejectWithErrorContainingMessageParts(
      [
        'Lambda payload does not satisfy the schema. Error: Failed to parse schema. This error was caused by:'
      ]
    );
  });
});

function testit(event: Event): Promise<void> {
  setEnv(event.lambdaConfig);
  return handler(event, {} as Context);
}

function setEnv(config: ActionableEventsConfig) {
  console.log(`TODO. Just to avoid errors meanwhile ${JSON.stringify(config)}`);
}
