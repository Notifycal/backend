import type { MiddyfiedHandler } from '@middy/core';
import type { Context, SQSEvent, SQSRecord } from 'aws-lambda';
import { expect, test, vi, type SuiteFactory } from 'vitest';

export type RecordProcessorModule = {
  recordProcessor: (...args: Array<never>) => Promise<void>;
};

export const createSqsHandlerTestSuite =
  ({
    handler,
    setEnv,
    validSqsBatchEvent,
    recordProcessorModule
  }: {
    handler: MiddyfiedHandler;
    setEnv: () => void;
    validSqsBatchEvent: SQSEvent;
    recordProcessorModule: RecordProcessorModule;
  }): SuiteFactory =>
  () => {
    function testit(event: SQSEvent): Promise<unknown> {
      setEnv();
      return handler(event, {} as Context);
    }

    test('should parse config and events', () => {
      vi.spyOn(recordProcessorModule, 'recordProcessor').mockResolvedValue({});
      return testit(validSqsBatchEvent).then((r) => {
        expect(r).toStrictEqual({
          batchItemFailures: []
        });
      });
    });

    test('should indicate partial failure in response', () => {
      const processorSpy = vi
        .spyOn(recordProcessorModule, 'recordProcessor')
        .mockResolvedValueOnce({})
        .mockImplementation(() => {
          throw new Error('Boom!');
        });

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
      vi.spyOn(recordProcessorModule, 'recordProcessor').mockRejectedValue(new Error('Boom!'));
      return expect(testit(validSqsBatchEvent)).rejects.toThrow(
        'All records failed processing. See individual errors below.'
      );
    });

    test('should fail to parse an invalid event', () => {
      const invalidEvent = { Records: [{ someField: 'someValue' }] };
      return expect(
        testit(invalidEvent as unknown as SQSEvent)
      ).toRejectWithErrorContainingMessageParts([
        'Lambda payload does not satisfy the schema. Error: Failed to parse schema. This error was caused by:'
      ]);
    });
  };
