import type { InsufficientCreditsError } from './Errors';

export type CreditOperationResult = CreditDeductionResult | DemoCounterIncrementResult;

export interface CreditOperationDetails {
  fromBalance: 'subscription' | 'topup';
  quantity: number | 'clear' | 'reset';
}

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

export interface CreditDeductionSuccess extends BaseSuccess {
  readonly operationDetails: CreditOperationDetails;
  readonly balances: CreditBalances;
}
export interface CreditDeductionInsufficientCreditsError extends BaseError<'InsufficientCredits'> {
  error: InsufficientCreditsError;
}
export type CreditDeductionBadRequestError = BaseError<'BadRequestError'>;
export type CreditDeductionUnexpectedError = BaseError<'UnknownError'>;

export type CreditDeductionResult =
  | CreditDeductionSuccess
  | CreditDeductionInsufficientCreditsError
  | CreditDeductionBadRequestError
  | CreditDeductionUnexpectedError;

export interface CreditAdditionSuccess extends BaseSuccess {
  readonly operationDetails: CreditOperationDetails;
  readonly balances: CreditBalances;
}
export type CreditAdditionBadRequestError = BaseError<'BadRequestError'>;
export type CreditAdditionUnexpectedError = BaseError<'UnknownError'>;

export type CreditAdditionResult =
  | CreditAdditionSuccess
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
