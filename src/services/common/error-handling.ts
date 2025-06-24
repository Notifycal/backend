import type { Logger } from '@aws-lambda-powertools/logger';
import type { LogItemExtraInput } from '@aws-lambda-powertools/logger/types';
import { logger as _logger } from '@common/powertools';

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return 'An unknown error occurred.';
  }
}

export function rejectWithErrorMessage(baseMsg: string, error: unknown): Promise<never> {
  return Promise.reject(new Error(baseMsg, { cause: error }));
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

export function throwError(msg: string, error?: unknown, ...extraInput: LogItemExtraInput): never {
  _throwError(msg, _logger, error, 'error', ...[...extraInput]);
}

export function throwErrorV2(
  msg: string,
  logger: Logger,
  error?: unknown,
  ...extraInput: LogItemExtraInput
): never {
  _throwError(msg, logger, error, 'error', ...[...extraInput]);
}
