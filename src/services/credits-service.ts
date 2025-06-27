import type { Logger } from '@aws-lambda-powertools/logger';
import { InsufficientCreditsError } from '@model/Errors';
import type { TierId } from '@model/PaymentPlans';
import type { IdpName, UserId, UserStatus } from '@notifycal/shared/types';
import type { UserBaseStore } from '@services/stores/user-base-store';
import { P, match } from 'ts-pattern';

export interface CreditDeductionSuccess {
  readonly success: true;
  readonly operationId: 'Success';
  readonly subscriptionCreditBalance: number;
  readonly topupCreditBalance: number;
}
export interface CreditDeductionInsufficientCreditsError {
  readonly success: false;
  readonly operationId: 'InsufficientCredits';
  error: InsufficientCreditsError;
}
export interface CreditDeductionUnexpectedError {
  readonly success: false;
  readonly operationId: 'UnknownError';
  error: unknown;
}
export type CreditDeductionResult =
  | CreditDeductionSuccess
  | CreditDeductionInsufficientCreditsError
  | CreditDeductionUnexpectedError;

export interface CreditAdditionSuccess {
  readonly success: true;
  readonly operationId: 'Success';
  readonly subscriptionCreditBalance: number;
  readonly topupCreditBalance: number;
}
export interface CreditAdditionUnexpectedError {
  readonly success: false;
  readonly operationId: 'UnknownError';
  error: unknown;
}

export type CreditAdditionResult = CreditAdditionSuccess | CreditAdditionUnexpectedError;

export class CreditsService<TIdpName extends IdpName> {
  public constructor(
    private readonly userStore: UserBaseStore<TIdpName>,
    private readonly logger: Logger
  ) {}

  //TODO topups
  public async deductCredits(
    userId: UserId,
    credits: number,
    country: 'ES',
    countryToSMSCostCreditsMap: Record<'ES', number>
  ): Promise<CreditDeductionResult> {
    if (credits <= 0) {
      return {
        success: false,
        operationId: 'UnknownError',
        error: new Error('Credits must be greater than 0')
      };
    }

    const creditToDeductPerUnit = countryToSMSCostCreditsMap[country];
    const totalCreditsToDeduct = creditToDeductPerUnit * credits;

    return this.userStore.deductSubscriptionCredits(userId, totalCreditsToDeduct, this.logger).then(
      (user) => {
        const creditDeductionOperation: CreditDeductionSuccess = {
          success: true,
          operationId: 'Success',
          subscriptionCreditBalance: user.Credits?.SubscriptionCreditBalance || 0,
          topupCreditBalance: user.Credits?.TopupCreditBalance || 0
        };
        return creditDeductionOperation;
      },
      async (error): Promise<CreditDeductionResult> => {
        return match(error)
          .with(P.instanceOf(InsufficientCreditsError), (insufficientError) => {
            const result: CreditDeductionInsufficientCreditsError = {
              success: false,
              operationId: 'InsufficientCredits',
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
              operationId: 'UnknownError',
              error: unexpectedError
            };
            return result;
          });
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
        operationId: 'UnknownError',
        error: new Error('Credits must be non-negative')
      });
    }

    return this.userStore.resetSubscriptionCredits(userId, tierId, credits, this.logger).then(
      (user) => {
        const creditAdditionOperation: CreditAdditionSuccess = {
          success: true,
          operationId: 'Success',
          subscriptionCreditBalance: user.Credits?.SubscriptionCreditBalance || 0,
          topupCreditBalance: user.Credits?.TopupCreditBalance || 0
        };
        return this.userStore
          .updateStatus(userId, 'live')
          .then(() => creditAdditionOperation, this.errorHandlerForIdempotentOp('resetCredits'));
      },
      (error: unknown) => {
        const result: CreditAdditionUnexpectedError = {
          success: false,
          operationId: 'UnknownError',
          error
        };
        return result;
      }
    );
  }

  private addCreditsOperation(
    userId: UserId,
    credits: number,
    options:
      | {
          type: 'subscription';
          tierId: TierId;
        }
      | {
          type: 'topup';
        }
  ): Promise<CreditAdditionResult> {
    if (credits <= 0) {
      return Promise.resolve({
        success: false,
        operationId: 'UnknownError',
        error: new Error('Credits to add must be greater or equal than 0')
      });
    }

    const storeOperation =
      options.type === 'subscription'
        ? this.userStore.addSubscriptionCredits(userId, credits, options.tierId, this.logger)
        : this.userStore.addTopupCredits(userId, credits, this.logger);

    return storeOperation.then(
      (user) => {
        const creditAdditionOperation: CreditAdditionSuccess = {
          success: true,
          operationId: 'Success',
          subscriptionCreditBalance: user.Credits?.SubscriptionCreditBalance || 0,
          topupCreditBalance: user.Credits?.TopupCreditBalance || 0
        };
        return this.userStore
          .updateStatus(userId, 'live')
          .then(() => creditAdditionOperation, this.errorHandlerForNonIdempotentOp('addCredits'));
      },
      (error: unknown) => {
        const result: CreditAdditionUnexpectedError = {
          success: false,
          operationId: 'UnknownError',
          error
        };
        return result;
      }
    );
  }

  public addSubscriptionCredits(
    userId: UserId,
    credits: number,
    tierId: TierId
  ): Promise<CreditAdditionResult> {
    return this.addCreditsOperation(userId, credits, { type: 'subscription', tierId });
  }

  public addTopupCredits(userId: UserId, credits: number): Promise<CreditAdditionResult> {
    return this.addCreditsOperation(userId, credits, { type: 'topup' });
  }

  public clearSubscriptionCredits(
    userId: UserId,
    status: UserStatus
  ): Promise<CreditDeductionResult> {
    return this.userStore.clearSubscriptionCredits(userId, this.logger).then(
      (user) => {
        const creditDeductionOperation: CreditDeductionSuccess = {
          success: true,
          operationId: 'Success',
          subscriptionCreditBalance: user.Credits?.SubscriptionCreditBalance || 0,
          topupCreditBalance: user.Credits?.TopupCreditBalance || 0
        };
        return this.userStore
          .updateStatus(userId, status)
          .then(() => creditDeductionOperation, this.errorHandlerForIdempotentOp('deleteCredits'));
      },
      (error: unknown) => {
        const result: CreditDeductionUnexpectedError = {
          success: false,
          operationId: 'UnknownError',
          error
        };
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
        operationId: 'UnknownError',
        error
      };
      this.logger.error(msg, {
        error
      });
      return Promise.resolve(result);
    };
  }
}
