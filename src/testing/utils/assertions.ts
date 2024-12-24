import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export function assert(
  result: APIGatewayProxyStructuredResultV2,
  expectation: APIGatewayProxyStructuredResultV2
): void {
  expect(result).toEqual(expectation);
}
