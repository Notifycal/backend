/* eslint-disable vitest/require-top-level-describe */
import type { MiddyfiedHandler } from '@middy/core';
import type { Context, DynamoDBRecord, DynamoDBStreamEvent, SQSEvent, SQSRecord } from 'aws-lambda';
import { match, P } from 'ts-pattern';
import { expect, test, type MockedFunction, type SuiteFactory } from 'vitest';

export type RecordProcessorModule = {
  recordProcessor: (...args: Array<never>) => Promise<void>;
};

export const createSqsHandlerTestSuite =
  <TRecord, TConfig>({
    handler,
    setEnv,
    validBatchEvent,
    recordProcessorMockFn
  }: {
    handler: MiddyfiedHandler;
    setEnv: () => void;
    validBatchEvent: SQSEvent | DynamoDBStreamEvent;
    recordProcessorMockFn: () => MockedFunction<
      (record: TRecord, config: TConfig) => Promise<void>
    >;
  }): SuiteFactory =>
  () => {
    function testit(event: SQSEvent | DynamoDBStreamEvent): Promise<unknown> {
      setEnv();
      return handler(event, {} as Context);
    }

    test('should parse config and events', () => {
      recordProcessorMockFn().mockResolvedValue(undefined);
      return testit(validBatchEvent).then((r) => {
        expect(r).toStrictEqual({
          batchItemFailures: []
        });
      });
    });

    test('should indicate partial failure in response', () => {
      const processorSpy = recordProcessorMockFn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValue(new Error('Boom!'));

      const eventError: SQSRecord | DynamoDBRecord = match(validBatchEvent.Records[0])
        .with({ messageId: P.string }, (validSqsRecord) => ({
          ...validSqsRecord,
          messageId: 'messageWithErrorId'
        }))
        .with({ eventID: P.string }, (validDynamoDbRecord) => validDynamoDbRecord)
        .with({ messageId: P.optional(undefined), eventID: P.optional(undefined) }, () => {
          throw new Error('Unexpected event record: no messageId or eventID');
        })
        .exhaustive();
      const input: SQSEvent | DynamoDBStreamEvent = {
        Records: [validBatchEvent.Records[0], eventError]
      };

      return testit(input).then((r) => {
        expect(processorSpy).toHaveBeenCalledTimes(2);
        expect(r).toStrictEqual({
          batchItemFailures: [
            {
              itemIdentifier: match(eventError)
                .with({ messageId: P.string }, (_eventError) => _eventError.messageId)
                .with({ eventID: P.string }, (_eventError) => _eventError.dynamodb?.SequenceNumber)
                .with({ messageId: P.optional(undefined), eventID: P.optional(undefined) }, () => {
                  throw new Error('Unexpected event record: no messageId or eventID');
                })
                .exhaustive()
            }
          ]
        });
      });
    });

    test('should throw an error if processing of every item fails', () => {
      recordProcessorMockFn().mockRejectedValue(new Error('Boom!'));
      return expect(testit(validBatchEvent)).rejects.toThrow(
        'All records failed processing. See individual errors below.'
      );
    });

    test('should fail to parse an invalid event', () => {
      const invalidEvent = { Records: [{ someField: 'someValue' }] };
      return expect(
        testit(invalidEvent as unknown as SQSEvent)
      ).toRejectWithErrorContainingMessageParts(['Lambda payload does not satisfy the schema']);
    });
  };
