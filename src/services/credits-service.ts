import type { Logger } from '@aws-lambda-powertools/logger';
import { InsufficientCreditsError } from '@model/Errors';
import type { IdpName, TierId, TopupId, UserId, UserStatus } from '@notifycal/shared/types';
import type { UserBaseStore } from '@services/stores/user-base-store';
import { P, match } from 'ts-pattern';

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

export class CreditsService<TIdpName extends IdpName> {
  public constructor(
    private readonly userStore: UserBaseStore<TIdpName>,
    private readonly logger: Logger
  ) {}

  public async deductCredits(userId: UserId, credits: number): Promise<CreditDeductionResult> {
    if (credits <= 0) {
      return Promise.resolve(this.badRequestCreditError(credits));
    }
    return this.userStore.deductCredits(userId, credits, this.logger).then(
      (result) => {
        const creditDeductionOperation: CreditDeductionSuccess = {
          success: true,
          result: 'Success',
          operationDetails: {
            fromBalance: result.balance,
            quantity: result.quantity
          },
          balances: {
            subscription: result.user.Credits.SubscriptionCreditBalance,
            topup: result.user.Credits.TopupCreditBalance
          }
        };
        return creditDeductionOperation;
      },
      (error): Promise<CreditDeductionResult> => {
        return match(error)
          .with(P.instanceOf(InsufficientCreditsError), (insufficientError) => {
            const result: CreditDeductionInsufficientCreditsError = {
              success: false,
              result: 'InsufficientCredits',
              error: insufficientError
            };
            return this.userStore
              .updateStatus(userId, 'out-of-credits')
              .then(
                () => result,
                this.errorHandlerForIdempotentOp('deductCredits-while-out-of-credits')
              );
          })
          .otherwise((unexpectedError) => {
            const result: CreditDeductionUnexpectedError = {
              success: false,
              result: 'UnknownError',
              error: unexpectedError
            };
            return Promise.resolve(result);
          });
      }
    );
  }

  public incrementDemoReminderCount(
    userId: UserId,
    demoReminderLimit: number
  ): Promise<DemoCounterIncrementResult> {
    return this.userStore.incrementDemoReminderCount(userId, demoReminderLimit, this.logger).then(
      (result) => {
        const successResult: DemoCounterIncrementSuccess = {
          success: true,
          result: 'Success',
          demoRemindersCount: result.DemoReminderCount
        };
        return successResult;
      },
      (error) => {
        if (error instanceof Error && error.message === 'Demo reminder limit reached') {
          const demoLimitError: DemoCounterLimitReachedError = {
            success: false,
            result: 'DemoCounterLimitReachedError',
            error
          };
          return demoLimitError;
        }
        const unexpectedError: DemoCounterIncrementUnexpectedError = {
          success: false,
          result: 'UnknownError',
          error
        };
        return unexpectedError;
      }
    );
  }

  public resetSubscriptionCredits(
    userId: UserId,
    credits: number,
    tierId: TierId
  ): Promise<CreditAdditionResult> {
    if (credits < 0) {
      return Promise.resolve({
        success: false,
        result: 'UnknownError',
        error: new Error('Credits must be non-negative')
      });
    }

    return this.userStore.resetSubscriptionCredits(userId, tierId, credits, this.logger).then(
      (user) => {
        const creditAdditionOperation: CreditAdditionSuccess = {
          success: true,
          result: 'Success',
          operationDetails: {
            fromBalance: 'subscription',
            quantity: 'reset'
          },
          balances: {
            subscription: user.Credits.SubscriptionCreditBalance,
            topup: user.Credits.TopupCreditBalance
          }
        };
        return this.userStore
          .updateStatus(userId, 'live')
          .then(() => creditAdditionOperation, this.errorHandlerForIdempotentOp('resetCredits'));
      },
      (error: unknown) => {
        const result: CreditAdditionUnexpectedError = {
          success: false,
          result: 'UnknownError',
          error
        };
        return result;
      }
    );
  }

  public addCredits(
    userId: UserId,
    credits: number,
    product:
      | {
          type: 'subscription';
          id: TierId;
        }
      | {
          type: 'topup';
          id: TopupId;
        }
  ): Promise<CreditAdditionResult> {
    if (credits <= 0) {
      return Promise.resolve(this.badRequestCreditError(credits));
    }

    return this.userStore.addCredits(userId, credits, product, this.logger).then(
      (user) => {
        const creditAdditionOperation: CreditAdditionSuccess = {
          success: true,
          result: 'Success',
          operationDetails: {
            fromBalance: product.type,
            quantity: credits
          },
          balances: {
            subscription: user.Credits.SubscriptionCreditBalance,
            topup: user.Credits.TopupCreditBalance
          }
        };
        return this.userStore
          .updateStatus(userId, 'live')
          .then(() => creditAdditionOperation, this.errorHandlerForNonIdempotentOp('addCredits'));
      },
      (error: unknown) => {
        const result: CreditAdditionUnexpectedError = {
          success: false,
          result: 'UnknownError',
          error
        };
        return result;
      }
    );
  }

  public clearSubscriptionCredits(
    userId: UserId,
    status: UserStatus
  ): Promise<CreditDeductionResult> {
    return this.userStore.clearSubscriptionCredits(userId, this.logger).then(
      (user) => {
        const creditDeductionOperation: CreditDeductionSuccess = {
          success: true,
          result: 'Success',
          operationDetails: {
            fromBalance: 'subscription',
            quantity: 'clear'
          },
          balances: {
            subscription: user.Credits.SubscriptionCreditBalance,
            topup: user.Credits.TopupCreditBalance
          }
        };
        return this.userStore
          .updateStatus(userId, status)
          .then(() => creditDeductionOperation, this.errorHandlerForIdempotentOp('deleteCredits'));
      },
      (error: unknown) => {
        const result: CreditDeductionUnexpectedError = {
          success: false,
          result: 'UnknownError',
          error
        };
        this.logger.warn(`There was an error while clearing subscription credits`, {
          error
        });
        return result;
      }
    );
  }

  private errorHandlerForIdempotentOp(
    operation: 'resetCredits' | 'deleteCredits' | 'deductCredits-while-out-of-credits'
  ): (error: unknown) => Promise<never> {
    return (error: unknown) => {
      return Promise.reject(
        new Error(
          `Error while handling ${operation}. Throwing error so that it gets retried cause the operation is idempotent. Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { cause: error }
        )
      );
    };
  }

  private errorHandlerForNonIdempotentOp(
    operation: 'addCredits'
  ): (error: unknown) => Promise<CreditAdditionUnexpectedError> {
    return (error: unknown) => {
      const msg = `The user status update has failed after the non idempotent operation ${operation} in credit service. We cannot retry...`;
      const result: CreditAdditionUnexpectedError = {
        success: false,
        result: 'UnknownError',
        error
      };
      this.logger.error(msg, {
        error
      });
      return Promise.resolve(result);
    };
  }

  private badRequestCreditError(
    credits: number
  ): CreditDeductionBadRequestError | CreditAdditionBadRequestError {
    return {
      success: false,
      result: 'BadRequestError',
      error: new Error(`Credits must be greater than 0. Credits: ${credits}`)
    };
  }
}
