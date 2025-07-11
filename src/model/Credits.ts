import type { InsufficientCreditsError } from './Errors';

export type CreditOperationResult = CreditDeductionResult | DemoCounterIncrementResult;

export interface CreditOperationDetails {
  fromBalance: 'subscription' | 'topup';
  quantity: number | 'clear' | 'reset';
}
export interface CreditDeductionSuccess {
  readonly success: true;
  readonly result: 'Success';
  readonly operationDetails: CreditOperationDetails;
  readonly balances: {
    readonly subscription: number;
    readonly topup: number;
  };
}
export interface CreditDeductionInsufficientCreditsError {
  readonly success: false;
  readonly result: 'InsufficientCredits';
  error: InsufficientCreditsError;
}
export interface CreditDeductionBadRequestError {
  readonly success: false;
  readonly result: 'BadRequestError';
  error: unknown;
}
export interface CreditDeductionUnexpectedError {
  readonly success: false;
  readonly result: 'UnknownError';
  error: unknown;
}
export type CreditDeductionResult =
  | CreditDeductionSuccess
  | CreditDeductionInsufficientCreditsError
  | CreditDeductionBadRequestError
  | CreditDeductionUnexpectedError;

export interface CreditAdditionSuccess {
  readonly success: true;
  readonly result: 'Success';
  readonly operationDetails: CreditOperationDetails;
  readonly balances: {
    readonly subscription: number;
    readonly topup: number;
  };
}
export interface CreditAdditionBadRequestError {
  readonly success: false;
  readonly result: 'BadRequestError';
  error: unknown;
}
export interface CreditAdditionUnexpectedError {
  readonly success: false;
  readonly result: 'UnknownError';
  error: unknown;
}

export type CreditAdditionResult =
  | CreditAdditionSuccess
  | CreditAdditionBadRequestError
  | CreditAdditionUnexpectedError;

export interface DemoCounterIncrementSuccess {
  readonly success: true;
  readonly result: 'Success';
  readonly demoRemindersCount: number;
}

export interface DemoCounterLimitReachedError {
  readonly success: false;
  readonly result: 'DemoCounterLimitReachedError';
  error: unknown;
}

export interface DemoCounterIncrementUnexpectedError {
  readonly success: false;
  readonly result: 'UnknownError';
  error: unknown;
}

export type DemoCounterIncrementResult =
  | DemoCounterIncrementSuccess
  | DemoCounterLimitReachedError
  | DemoCounterIncrementUnexpectedError;
