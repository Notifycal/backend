import { expect } from 'vitest';

import type { APIGatewayProxyResult } from 'aws-lambda';

export function assert(result: APIGatewayProxyResult, expectation: APIGatewayProxyResult): void {
  expect(result).toEqual(expectation);
}
