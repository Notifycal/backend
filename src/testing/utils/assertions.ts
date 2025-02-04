import { expect } from 'vitest';

export function assert<T>(result: T, expectation: T): void {
  expect(result).toStrictEqual(expectation);
}
