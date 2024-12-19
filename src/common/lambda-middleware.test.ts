import {
  ParsedResult,
  ParsedResultError,
  ParsedResultSuccess
} from '@aws-lambda-powertools/parser/types';
import { describe, expect } from '@jest/globals';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handleInputValidation } from './lambda-middleware';

interface TestPayload {
  testField: string;
}

describe('Lambda middleware', () => {
  it('should validate request', () => {
    const input = {
      success: true,
      data: {
        testField: 'some_value'
      }
    } as ParsedResultSuccess<TestPayload>;
    return expect(testit(input)).resolves.toBe(input.data);
  });

  it('should not validate request', () => {
    const input = {
      success: false,
      error: new Error('Boom!')
    } as ParsedResultError<APIGatewayProxyEventV2>;
    return expect(testit(input)).rejects.toBe(input.error);
  });

  function testit(input: ParsedResult<APIGatewayProxyEventV2, TestPayload>) {
    return handleInputValidation(input);
  }
});
