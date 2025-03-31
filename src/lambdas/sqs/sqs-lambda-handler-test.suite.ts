/* eslint-disable vitest/require-top-level-describe */
import type { MiddyfiedHandler } from '@middy/core';
import type { Context, SQSEvent, SQSRecord } from 'aws-lambda';
import { expect, test, type MockedFunction, type SuiteFactory } from 'vitest';

export type RecordProcessorModule = {
  recordProcessor: (...args: Array<never>) => Promise<void>;
};

export const createSqsHandlerTestSuite =
  <TRecord, TConfig>({
    handler,
    setEnv,
    validSqsBatchEvent,
    recordProcessorMockFn
  }: {
    handler: MiddyfiedHandler;
    setEnv: () => void;
    validSqsBatchEvent: SQSEvent;
    recordProcessorMockFn: () => MockedFunction<
      (record: TRecord, config: TConfig) => Promise<void>
    >;
  }): SuiteFactory =>
  () => {
    function testit(event: SQSEvent): Promise<unknown> {
      setEnv();
      return handler(event, {} as Context);
    }

    test('should parse config and events', () => {
      recordProcessorMockFn().mockResolvedValue(undefined);
      return testit(validSqsBatchEvent).then((r) => {
        expect(r).toStrictEqual({
          batchItemFailures: []
        });
      });
    });

    test('should indicate partial failure in response', () => {
      const processorSpy = recordProcessorMockFn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValue(new Error('Boom!'));

      const eventError: SQSRecord = {
        ...validSqsBatchEvent.Records[0],
        messageId: 'messageWithErrorId'
      };
      const input: SQSEvent = {
        Records: [validSqsBatchEvent.Records[0], eventError]
      };

      return testit(input).then((r) => {
        expect(processorSpy).toHaveBeenCalledTimes(2);
        expect(r).toStrictEqual({
          batchItemFailures: [{ itemIdentifier: eventError.messageId }]
        });
      });
    });

    test('should throw an error if processing of every item fails', () => {
      recordProcessorMockFn().mockRejectedValue(new Error('Boom!'));
      return expect(testit(validSqsBatchEvent)).rejects.toThrow(
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
