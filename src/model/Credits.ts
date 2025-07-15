import type { InsufficientCreditsError } from './Errors';

export type CreditOperationResult = CreditDeductionResult<'deduct'> | DemoCounterIncrementResult;

export type CreditDeductionOperationDetails =
  | { fromBalance: 'subscription' | 'topup'; type: 'deduct'; quantity: number }
  | { fromBalance: 'subscription' | 'topup'; type: 'clear' };

export type CreditAdditionOperationDetails =
  | { fromBalance: 'subscription' | 'topup'; type: 'add'; quantity: number }
  | { fromBalance: 'subscription' | 'topup'; type: 'reset' };

export type CreditDeductionOperationType = CreditDeductionOperationDetails['type'];
export type CreditAdditionOperationType = CreditAdditionOperationDetails['type'];

interface BaseSuccess<TResult extends string = 'Success'> {
  readonly success: true;
  readonly result: TResult;
}

interface BaseError<TResult extends string> {
  readonly success: false;
  readonly result: TResult;
  error: unknown;
}

interface CreditBalances {
  readonly subscription: number;
  readonly topup: number;
}

export interface CreditDeductionSuccess<TOperationType extends CreditDeductionOperationType>
  extends BaseSuccess {
  readonly operationDetails: Extract<CreditDeductionOperationDetails, { type: TOperationType }>;
  readonly balances: CreditBalances;
}
export interface CreditDeductionInsufficientCreditsError extends BaseError<'InsufficientCredits'> {
  error: InsufficientCreditsError;
}
export type CreditDeductionBadRequestError = BaseError<'BadRequestError'>;
export type CreditDeductionUnexpectedError = BaseError<'UnknownError'>;

export type CreditDeductionResult<TOperationType extends CreditDeductionOperationType> =
  | CreditDeductionSuccess<TOperationType>
  | CreditDeductionInsufficientCreditsError
  | CreditDeductionBadRequestError
  | CreditDeductionUnexpectedError;

export interface CreditAdditionSuccess<TOperationType extends CreditAdditionOperationType>
  extends BaseSuccess {
  readonly operationDetails: Extract<CreditAdditionOperationDetails, { type: TOperationType }>;
  readonly balances: CreditBalances;
}
export type CreditAdditionBadRequestError = BaseError<'BadRequestError'>;
export type CreditAdditionUnexpectedError = BaseError<'UnknownError'>;

export type CreditAdditionResult<TOperationType extends CreditAdditionOperationType> =
  | CreditAdditionSuccess<TOperationType>
  | CreditAdditionBadRequestError
  | CreditAdditionUnexpectedError;

export interface DemoCounterIncrementSuccess extends BaseSuccess {
  readonly demoRemindersCount: number;
}
export type DemoCounterLimitReachedError = BaseError<'DemoCounterLimitReachedError'>;
export type DemoCounterIncrementUnexpectedError = BaseError<'UnknownError'>;

export type DemoCounterIncrementResult =
  | DemoCounterIncrementSuccess
  | DemoCounterLimitReachedError
  | DemoCounterIncrementUnexpectedError;

export interface DemoCounterDecrementSuccess extends BaseSuccess {
  readonly demoRemindersCount: number;
}
export type DemoCounterDecrementUnexpectedError = BaseError<'UnknownError'>;

export type DemoCounterDecrementResult =
  | DemoCounterDecrementSuccess
  | DemoCounterDecrementUnexpectedError;
