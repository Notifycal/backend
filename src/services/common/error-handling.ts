import type { Logger } from '@aws-lambda-powertools/logger';
import type { LogItemExtraInput } from '@aws-lambda-powertools/logger/types';
import type { BaseErrorEvent, BaseEvent } from '@model/app-events/BaseEvent';
import type { CreditAdditionResult, CreditDeductionResult } from '@model/Credits';
import type { SnsService } from '@services/sns';

export function handleServiceOperation<
  TResult extends CreditAdditionResult | CreditDeductionResult,
  TEvent extends BaseEvent,
  TErrorEvent extends BaseErrorEvent
>(
  operation: Promise<TResult>,
  successEventFactory: (data: TResult) => TEvent,
  failureEventFactory: (result: TResult | undefined, error: unknown) => TErrorEvent,
  snsService: SnsService
): Promise<TResult> {
  return operation
    .then((result) => {
      const isSuccess = result.success;
      return snsService
        .safePublish(
          isSuccess ? successEventFactory(result) : failureEventFactory(result, undefined)
        )
        .then(() => result);
    })
    .catch((error) => {
      return (
        snsService
          .safePublish(failureEventFactory(undefined, error))
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          .then(() => Promise.reject(error))
      );
    });
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return 'An unknown error occurred.';
  }
}

export function rejectWithMessage(baseMsg: string): Promise<never> {
  return Promise.reject(new Error(baseMsg));
}

export function rejectWithMessageAndError(baseMsg: string, cause: unknown): Promise<never> {
  return Promise.reject(new Error(baseMsg, { cause }));
}

export function rejectWithError(error: unknown): Promise<never> {
  return Promise.reject(
    error instanceof Error ? error : new Error(String(error), { cause: error })
  );
}

function _throwError(
  msg: string,
  logger: Logger,
  error?: unknown,
  severity: 'warning' | 'error' = 'error',
  ...extraInput: LogItemExtraInput
): never {
  const logAttributes = { error: error, ...extraInput };
  if (severity && severity === 'warning') {
    logger.warn(msg, logAttributes);
  } else {
    logger.error(msg, logAttributes);
  }
  throw new Error(msg, { cause: error, ...extraInput });
}

export function rethrowError(
  msg: string,
  error: unknown,
  logger: Logger,
  ...extraInput: LogItemExtraInput
): never {
  _throwError(msg, logger, error, 'error', ...[...extraInput]);
}

export function throwError(msg: string, logger: Logger, ...extraInput: LogItemExtraInput): never {
  _throwError(msg, logger, undefined, 'error', ...[...extraInput]);
}

export function rethrowErrorHandler(
  message: string,
  logger: Logger,
  ...extraInput: LogItemExtraInput
): (error: unknown) => Promise<void | undefined> {
  return (error: unknown) => {
    rethrowError(message, error, logger, ...[...extraInput]);
  };
}
