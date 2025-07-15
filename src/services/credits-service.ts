import type { Logger } from '@aws-lambda-powertools/logger';
import type * as Credits from '@model/Credits';
import { InsufficientCreditsError } from '@model/Errors';
import type { IdpName, TierId, UserId, UserStatus } from '@notifycal/shared/types';
import type { UserBaseStore } from '@services/stores/user-base-store';
import { P, match } from 'ts-pattern';

export class CreditsService<TIdpName extends IdpName> {
  public constructor(
    private readonly userStore: UserBaseStore<TIdpName>,
    private readonly logger: Logger
  ) {}

  public async deductCredits(
    userId: UserId,
    credits: number
  ): Promise<Credits.CreditDeductionResult<'deduct'>> {
    if (credits <= 0) {
      return Promise.resolve(
        this.badRequestCreditError(credits) as Credits.CreditDeductionBadRequestError
      );
    }
    return this.userStore.deductCredits(userId, credits, this.logger).then(
      (result) => {
        const creditDeductionOperation: Credits.CreditDeductionSuccess<'deduct'> = {
          success: true,
          result: 'Success',
          operationDetails: {
            fromBalance: result.balance,
            type: 'deduct',
            quantity: result.quantity
          },
          balances: {
            subscription: result.user.Credits.SubscriptionCreditBalance,
            topup: result.user.Credits.TopupCreditBalance
          }
        };
        return creditDeductionOperation;
      },
      (error): Promise<Credits.CreditDeductionResult<'deduct'>> => {
        return match(error)
          .with(P.instanceOf(InsufficientCreditsError), (insufficientError) => {
            const result: Credits.CreditDeductionInsufficientCreditsError = {
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
            const result: Credits.CreditDeductionUnexpectedError = {
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
  ): Promise<Credits.DemoCounterIncrementResult> {
    return this.userStore.incrementDemoReminderCount(userId, demoReminderLimit).then(
      (result) => {
        const successResult: Credits.DemoCounterIncrementSuccess = {
          success: true,
          result: 'Success',
          demoRemindersCount: result.DemoReminderCount
        };
        return successResult;
      },
      (error) => {
        if (error instanceof Error && error.message === 'Demo reminder limit reached') {
          const demoLimitError: Credits.DemoCounterLimitReachedError = {
            success: false,
            result: 'DemoCounterLimitReachedError',
            error
          };
          return demoLimitError;
        }
        const unexpectedError: Credits.DemoCounterIncrementUnexpectedError = {
          success: false,
          result: 'UnknownError',
          error
        };
        return unexpectedError;
      }
    );
  }

  public decrementDemoReminderCount(userId: UserId): Promise<Credits.DemoCounterDecrementResult> {
    return this.userStore.decrementDemoReminderCount(userId).then(
      (result) => {
        const successResult: Credits.DemoCounterDecrementSuccess = {
          success: true,
          result: 'Success',
          demoRemindersCount: result.DemoReminderCount
        };
        return successResult;
      },
      (error) => {
        const unexpectedError: Credits.DemoCounterDecrementUnexpectedError = {
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
  ): Promise<Credits.CreditAdditionResult<'reset'>> {
    if (credits < 0) {
      return Promise.resolve({
        success: false,
        result: 'UnknownError',
        error: new Error('Credits must be non-negative')
      });
    }

    return this.userStore.resetSubscriptionCredits(userId, tierId, credits, this.logger).then(
      (user) => {
        const creditAdditionOperation: Credits.CreditAdditionSuccess<'reset'> = {
          success: true,
          result: 'Success',
          operationDetails: {
            fromBalance: 'subscription',
            type: 'reset'
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
        const result: Credits.CreditAdditionUnexpectedError = {
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
          id?: TierId;
        }
      | {
          type: 'topup';
        }
  ): Promise<Credits.CreditAdditionResult<'add'>> {
    const tierId = product.type === 'subscription' ? product.id : undefined;
    return this.performCreditAddition(userId, credits, product.type, tierId, 'addCredits');
  }

  public restoreCredits(
    userId: UserId,
    credits: number,
    balanceType: 'subscription' | 'topup'
  ): Promise<Credits.CreditAdditionResult<'add'>> {
    return this.performCreditAddition(userId, credits, balanceType, undefined, 'restoreCredits');
  }

  private performCreditAddition(
    userId: UserId,
    credits: number,
    balanceType: 'subscription' | 'topup',
    tierId: TierId | undefined,
    operation: 'addCredits' | 'restoreCredits'
  ): Promise<Credits.CreditAdditionResult<'add'>> {
    if (credits <= 0) {
      return Promise.resolve(
        this.badRequestCreditError(credits) as Credits.CreditAdditionBadRequestError
      );
    }

    return this.userStore.addCredits(userId, credits, balanceType, this.logger, tierId).then(
      (user) => {
        const creditAdditionOperation: Credits.CreditAdditionSuccess<'add'> = {
          success: true,
          result: 'Success',
          operationDetails: {
            fromBalance: balanceType,
            type: 'add',
            quantity: credits
          },
          balances: {
            subscription: user.Credits.SubscriptionCreditBalance,
            topup: user.Credits.TopupCreditBalance
          }
        };
        return this.userStore
          .updateStatus(userId, 'live')
          .then(() => creditAdditionOperation, this.errorHandlerForNonIdempotentOp(operation));
      },
      (error: unknown) => {
        const result: Credits.CreditAdditionUnexpectedError = {
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
  ): Promise<Credits.CreditDeductionResult<'clear'>> {
    return this.userStore.clearSubscriptionCredits(userId, this.logger).then(
      (user) => {
        const creditDeductionOperation: Credits.CreditDeductionSuccess<'clear'> = {
          success: true,
          result: 'Success',
          operationDetails: {
            fromBalance: 'subscription',
            type: 'clear'
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
        const result: Credits.CreditDeductionUnexpectedError = {
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
    operation: 'addCredits' | 'restoreCredits'
  ): (error: unknown) => Promise<Credits.CreditAdditionUnexpectedError> {
    return (error: unknown) => {
      const msg = `The user status update has failed after the non idempotent operation ${operation} in credit service. We cannot retry...`;
      const result: Credits.CreditAdditionUnexpectedError = {
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
  ): Credits.CreditDeductionBadRequestError | Credits.CreditAdditionBadRequestError {
    return {
      success: false,
      result: 'BadRequestError',
      error: new Error(`Credits must be greater than 0. Credits: ${credits}`)
    };
  }
}
