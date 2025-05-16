import { sleep } from '@testing/utils/utils';
import { describe, expect, it, vi } from 'vitest';
import {
  allSettledAllOrErrorHandler,
  doAndRethrow,
  doSafely,
  promiseTry,
  safeTap,
  tap
} from './promises';

describe(doSafely, () => {
  it('should call onSuccess when fn resolves', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const onError = vi.fn();
    const onSuccess = vi.fn();

    await doSafely(fn, onError, onSuccess);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('should call onError when fn rejects', async () => {
    const testError = new Error('Test error');
    const fn = vi.fn().mockRejectedValue(testError);
    const onError = vi.fn();
    const onSuccess = vi.fn();

    await doSafely(fn, onError, onSuccess);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(testError);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should use default onSuccess if not provided', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const onError = vi.fn();

    await doSafely(fn, onError);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('should still return a promise that resolves even when fn rejects', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Test error'));
    const onError = vi.fn();

    await expect(doSafely(fn, onError)).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('should handle non-Error objects in rejection', async () => {
    const nonErrorRejection = { customError: true, message: 'Not a standard error' };
    const fn = vi.fn().mockRejectedValue(nonErrorRejection);
    const onError = vi.fn();

    await doSafely(fn, onError);

    expect(onError).toHaveBeenCalledWith(nonErrorRejection);
  });

  it('should properly chain promises and maintain async context', async () => {
    let asyncFlag = false;
    const fn = vi.fn().mockImplementation(async () => {
      await sleep(100);
      asyncFlag = true;
      return 'async result';
    });
    const onSuccess = vi.fn(() => {
      expect(asyncFlag).toBe(true);
    });
    const onError = vi.fn();

    await doSafely(fn, onError, onSuccess);

    expect(asyncFlag).toBe(true);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('should handle errors thrown synchronously in fn', async () => {
    const syncError = new Error('Synchronous error');
    const fn = vi.fn(() => {
      throw syncError;
    });
    const onError = vi.fn();
    const onSuccess = vi.fn();

    await doSafely(fn, onError, onSuccess);

    expect(onError).toHaveBeenCalledWith(syncError);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe(allSettledAllOrErrorHandler, () => {
  it('returns a list of values when all promises are successful', () => {
    const results: Array<PromiseSettledResult<string>> = [
      { status: 'fulfilled', value: 'value1' },
      { status: 'fulfilled', value: 'value2' },
      { status: 'fulfilled', value: 'value3' }
    ];

    const output = allSettledAllOrErrorHandler(results, 'test action');

    expect(output).toStrictEqual(['value1', 'value2', 'value3']);
  });

  it('throws an error when some promises fail', () => {
    const results: Array<PromiseSettledResult<string>> = [
      { status: 'fulfilled', value: 'value1' },
      { status: 'rejected', reason: new Error('Failure') },
      { status: 'fulfilled', value: 'value3' }
    ];

    expect(() => {
      allSettledAllOrErrorHandler(results, 'test action');
    }).toThrow(`There were 1 failures to test action. Successes: 2. Total: 3. All results:`);
  });

  it('handles an empty array correctly', () => {
    const results: Array<PromiseSettledResult<string>> = [];
    const output = allSettledAllOrErrorHandler(results, 'test action');

    expect(output).toStrictEqual([]);
  });

  it('handles multiple failures correctly', () => {
    const results: Array<PromiseSettledResult<string>> = [
      { status: 'rejected', reason: new Error('Failure 1') },
      { status: 'fulfilled', value: 'value2' },
      { status: 'rejected', reason: new Error('Failure 3') }
    ];

    expect(() => {
      allSettledAllOrErrorHandler(results, 'test action');
    }).toThrow(`There were 2 failures to test action. Successes: 1. Total: 3. All results:`);
  });
});

describe(promiseTry, () => {
  it('resolves with the return value when function executes successfully', async () => {
    const result = await promiseTry(() => 'success');

    expect(result).toBe('success');
  });

  it('resolves with the promise value when function returns a promise that resolves', async () => {
    const result = await promiseTry(() => Promise.resolve('promise success'));

    expect(result).toBe('promise success');
  });

  it('rejects when function throws an error', async () => {
    await expect(
      promiseTry(() => {
        throw new Error('test error');
      })
    ).rejects.toThrow('test error');
  });

  it('rejects when function returns a promise that rejects', async () => {
    await expect(promiseTry(() => Promise.reject(new Error('promise error')))).rejects.toThrow(
      'promise error'
    );
  });

  it('wraps non-Error objects in an Error when thrown', async () => {
    await expect(
      promiseTry(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'string error';
      })
    ).rejects.toBeInstanceOf(Error);
  });
});

const doSomething = () => 4 + 4;

describe(tap, () => {
  it('calls the provided function with the input value in a promise chain', async () => {
    const mockFn = vi.fn(doSomething);

    const result = await Promise.resolve('test value').then(tap(mockFn));

    expect(mockFn).toHaveBeenCalledWith('test value');
    expect(result).toBe('test value');
  });

  it('returns the original value in the promise chain regardless of what the function returns', async () => {
    const result = await Promise.resolve('original value').then(tap(() => 'different value'));

    expect(result).toBe('original value');
  });

  it('waits for the function to complete if it returns a promise', async () => {
    let sideEffect = false;

    const result = await Promise.resolve('test').then(
      tap(async () => {
        await sleep(100);
        sideEffect = true;
      })
    );

    expect(sideEffect).toBe(true);
    expect(result).toBe('test');
  });

  it('propagates errors from the function', async () => {
    await expect(
      Promise.resolve('test').then(
        tap(() => {
          throw new Error('tap error');
        })
      )
    ).rejects.toThrow('tap error');
  });
});

describe(safeTap, () => {
  it('calls the provided function with the input value in a promise chain', async () => {
    const mockFn = vi.fn(doSomething);

    const result = await Promise.resolve('test value').then(safeTap(mockFn));

    expect(mockFn).toHaveBeenCalledWith('test value');
    expect(result).toBe('test value');
  });

  it('returns the original value in the promise chain regardless of what the function returns', async () => {
    const result = await Promise.resolve('original value').then(safeTap(() => 'different value'));

    expect(result).toBe('original value');
  });

  it('waits for the function to complete if it returns a promise', async () => {
    let sideEffect = false;

    const result = await Promise.resolve('test').then(
      safeTap(async () => {
        await sleep(100);
        sideEffect = true;
      })
    );

    expect(sideEffect).toBe(true);
    expect(result).toBe('test');
  });

  it('swallows errors from the function and continues the promise chain with the original value', async () => {
    const result = await Promise.resolve('original value').then(
      safeTap(() => {
        throw new Error('safe tap error');
      })
    );

    expect(result).toBe('original value');
  });

  it('swallows errors from promises returned by the function and continues the chain', async () => {
    const result = await Promise.resolve('original value').then(
      safeTap(() => Promise.reject(new Error('promise error')))
    );

    expect(result).toBe('original value');
  });

  it('can be used in the middle of a promise chain without breaking it', async () => {
    const result = await Promise.resolve('start')
      .then((value) => value + '-middle')
      .then(
        safeTap(() => {
          throw new Error('error in the middle');
        })
      )
      .then((value) => value + '-end');

    expect(result).toBe('start-middle-end');
  });
});

describe(doAndRethrow, () => {
  it('should execute the provided function in a promise chain', async () => {
    const mockFn = vi.fn();

    await expect(Promise.reject(new Error('boom!')).catch(doAndRethrow(mockFn))).rejects.toThrow(
      'boom!'
    );

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should preserve the original error message', async () => {
    const mockFn = vi.fn();
    const originalError = new Error('original error');

    await expect(Promise.reject(originalError).catch(doAndRethrow(mockFn))).rejects.toBe(
      originalError
    );
  });

  it('should work with synchronous functions', async () => {
    let sideEffect = false;
    const syncFn = () => {
      sideEffect = true;
    };

    await expect(
      Promise.reject(new Error('test error')).catch(doAndRethrow(syncFn))
    ).rejects.toThrow('test error');

    expect(sideEffect).toBe(true);
  });

  it('should work with asynchronous functions', async () => {
    let sideEffect = false;
    const asyncFn = async () => {
      await sleep(100);
      sideEffect = true;
    };

    await expect(
      Promise.reject(new Error('test error')).catch(doAndRethrow(asyncFn))
    ).rejects.toThrow('test error');

    expect(sideEffect).toBe(true);
  });

  it('should throw the function error if the provided function throws', async () => {
    const fnError = new Error('function error');
    const errorFn = () => {
      throw fnError;
    };

    await expect(
      Promise.reject(new Error('original error')).catch(doAndRethrow(errorFn))
    ).rejects.toThrow(fnError);
  });

  it('should throw the function error if the provided function rejects', async () => {
    const fnError = new Error('function promise error');
    const rejectFn = () => Promise.reject(fnError);

    await expect(
      Promise.reject(new Error('original error')).catch(doAndRethrow(rejectFn))
    ).rejects.toThrow(fnError);
  });
});
