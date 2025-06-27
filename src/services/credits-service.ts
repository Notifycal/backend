import type { Logger } from '@aws-lambda-powertools/logger';
import { InsufficientCreditsError } from '@model/Errors';
import type { IdpName, UserId } from '@notifycal/shared/types';
import type { UserBaseStore } from '@services/stores/user-base-store';
import { P, match } from 'ts-pattern';

export interface CreditDeductionSuccess {
  readonly success: true;
  readonly operationId: 'Success';
  subscriptionCreditBalance: number;
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
  subscriptionCreditBalance: number;
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

  public async deductCredits(
    userId: UserId,
    units: number,
    country: 'ES',
    countryToSMSCostCreditsMap: Record<'ES', number>
  ): Promise<CreditDeductionResult> {
    const creditToDeductPerUnit = countryToSMSCostCreditsMap[country];
    const totalCreditsToDeduct = creditToDeductPerUnit * units;
    return this.userStore.deductCredits(userId, totalCreditsToDeduct, this.logger).then(
      (user) => {
        const creditDeductionOperation: CreditDeductionSuccess = {
          success: true,
          operationId: 'Success',
          subscriptionCreditBalance: user.UserCredits?.SubscriptionCreditBalance || 0
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
            return this.userStore.updateStatus(userId, 'out-of-credits').then(() => result);
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

  public resetSubscriptionCredits(userId: UserId, credits: number): Promise<CreditAdditionResult> {
    return this.userStore.resetSubscriptionCredits(userId, credits, this.logger).then(
      (user) => {
        const creditDeductionOperation: CreditAdditionSuccess = {
          success: true,
          operationId: 'Success',
          subscriptionCreditBalance: user.UserCredits?.SubscriptionCreditBalance || 0
        };
        return this.userStore.updateStatus(userId, 'live').then(() => creditDeductionOperation);
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
}
