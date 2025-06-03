import { expect, type DeeplyAllowMatchers } from 'vitest';

export function assert<T>(result: T, expectation: DeeplyAllowMatchers<T>): void {
  expect(result).toStrictEqual(expectation);
}
