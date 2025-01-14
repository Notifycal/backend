/* eslint-disable @typescript-eslint/no-empty-object-type */
export interface CustomMatchers<R = unknown> {
  toRejectWithErrorContainingMessageParts: (expectedParts: Array<string>) => R;
}

export interface ExpectationResult {
  pass: boolean;
  message: () => string;
  // If you pass these, they will automatically appear inside a diff when
  // the matcher does not pass, so you don't need to print the diff yourself
  actual?: unknown;
  expected?: unknown;
}

declare module 'vitest' {
  interface Assertion<T> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
