import type { ExpectationResult } from '@testing/vitest.custom-matchers';

export async function toRejectWithErrorContainingMessageParts(
  received: Promise<Array<string>>,
  expected: Array<string>
): Promise<ExpectationResult> {
  return received
    .then(() => {
      return {
        pass: false,
        message: () => `Expected the promise to reject, but it resolved.`
      };
    })
    .catch((error) => {
      if (!(error instanceof Error)) {
        return {
          pass: false,
          message: () =>
            `Expected the promise to reject with an Error object, but received: ${typeof error}`
        };
      }

      const missingParts = expected.filter((part) => !error.message.includes(part));
      if (missingParts.length === 0) {
        return {
          pass: true,
          message: () =>
            `Expected the error message not to contain all of these parts: ${expected.map((p) => `"${p}"`).join(', ')}`
        };
      }

      return {
        pass: false,
        message: () =>
          `Expected the error message to contain all of these parts: ${expected.map((p) => `"${p}"`).join(', ')}, ` +
          `but the following parts were missing: ${missingParts.map((p) => `"${p}"`).join(', ')}. Full message: "${error.message}"`
      };
    });
}
