import 'jest';

declare global {
  namespace jest {
    interface Matchers<R> {
      toRejectWithErrorContainingMessageParts(expectedParts: Array<string>): Promise<R>;
    }
  }
}

export {};
