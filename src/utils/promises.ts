import { throwError } from '@services/common/error-handling';

export function allSettledAllOrErrorHandler<T>(
  results: Array<PromiseSettledResult<T>>,
  attemptedAction: string
): Array<T> {
  const successList = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (results.every((r) => r.status === 'fulfilled')) {
    return successList;
  }
  const rejectionList = results.filter((r) => r.status === 'rejected');
  throwError(
    `There were ${rejectionList.length} failures to ${attemptedAction}. Successes: ${successList.length}. Total: ${results.length}. All results:`,
    {},
    { results }
  );
}

export function promiseTry<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    return Promise.resolve(fn());
  } catch (error) {
    return Promise.reject(
      error instanceof Error ? error : new Error(String(error), { cause: error })
    );
  }
}

export function tap<T, Z>(fn: (value?: T) => Z | Promise<Z>): (value: T) => Promise<T> {
  return async (value: T): Promise<T> => {
    await fn(value);
    return value;
  };
}

export function doAndRethrow<T, Z>(fn: () => Z | Promise<Z>): (value: T) => Promise<T> {
  return async (error: unknown): Promise<T> => {
    await fn();
    throw error;
  };
}

export function safeTap<T, Z>(fn: (value?: T) => Z | Promise<Z>): (value: T) => Promise<T> {
  return async (value: T): Promise<T> => {
    try {
      await fn(value);
    } catch {
      /* empty */
    }
    return value;
  };
}

export function doSafely(
  fn: () => Promise<unknown>,
  onError: (error: unknown) => void,
  onSuccess: () => void = () => {}
): Promise<void> {
  return promiseTry(fn).then(
    () => {
      onSuccess();
    },
    (error) => {
      onError(error);
    }
  );
}
