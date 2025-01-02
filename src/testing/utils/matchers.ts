export async function toRejectWithErrorContainingMessageParts(
  this: jest.MatcherContext,
  received: Promise<unknown>,
  expectedParts: Array<string>
): Promise<jest.CustomMatcherResult> {
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

      const missingParts = expectedParts.filter((part) => !error.message.includes(part));
      if (missingParts.length === 0) {
        return {
          pass: true,
          message: () =>
            `Expected the error message not to contain all of these parts: ${expectedParts.map((p) => `"${p}"`).join(', ')}`
        };
      }

      return {
        pass: false,
        message: () =>
          `Expected the error message to contain all of these parts: ${expectedParts.map((p) => `"${p}"`).join(', ')}, ` +
          `but the following parts were missing: ${missingParts.map((p) => `"${p}"`).join(', ')}. Full message: "${error.message}"`
      };
    });
}
