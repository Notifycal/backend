function normalizeToError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (value && typeof value === 'object') {
    try {
      const err = new Error(
        'message' in value && typeof value.message === 'string'
          ? value.message
          : `Error: ${JSON.stringify(value)}`
      );
      if ('name' in value && typeof value.name === 'string') {
        err.name = value.name;
      } else {
        err.name = 'NormalizedError';
      }
      if ('stack' in value && typeof value.stack === 'string') {
        err.stack = value.stack;
      }
      if ('cause' in value) {
        err.cause = value.cause;
      }
      return err;
    } catch (e: unknown) {
      return new Error(`Unserializable object: ${typeof value}`, { cause: e });
    }
  }
  return new Error(`${typeof value}: ${String(value)}`);
}
export function mergeTypedErrors(
  normalizedErrors: Array<Error>,
  resultingErrorMessage: string = 'Everything went wrong'
): Error {
  const errorAttributes = normalizedErrors.reduce(
    (acc, error, index) => {
      return {
        ...acc,
        [`error${index}`]: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          cause: error.cause
        }
      };
    },
    {} as Record<string, unknown>
  );
  return new Error(resultingErrorMessage, { cause: errorAttributes });
}
export function mergeErrors(
  errors: Array<unknown>,
  resultingErrorMessage: string = 'Everything went wrong'
): Error {
  const normalizedErrors = errors.map(normalizeToError);
  return mergeTypedErrors(normalizedErrors, resultingErrorMessage);
}
