import { expect } from 'vitest';

export function assert(result: unknown, expectation: unknown): void {
  expect(result).toStrictEqual(expectation);
}
