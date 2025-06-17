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
  public constructor(private readonly userStore: UserBaseStore<TIdpName>) {}

  public async deductCredits(
    userId: UserId,
    units: number,
    country: 'ES',
    countryToSMSCostCreditsMap: Record<'ES', number>
  ): Promise<CreditDeductionResult> {
    const creditToDeductPerUnit = countryToSMSCostCreditsMap[country];
    const totalCreditsToDeduct = creditToDeductPerUnit * units;
    return this.userStore.deductCredits(userId, totalCreditsToDeduct).then(
      (user) => {
        const creditDeductionOperation: CreditDeductionSuccess = {
          success: true,
          operationId: 'Success',
          subscriptionCreditBalance: user.UserCredits?.SubscriptionCreditBalance || 0
        };
        return creditDeductionOperation;
      },
      (error: unknown) => {
        return match(error)
          .with(P.instanceOf(InsufficientCreditsError), (insufficientError) => {
            const result: CreditDeductionInsufficientCreditsError = {
              success: false,
              operationId: 'InsufficientCredits',
              error: insufficientError
            };
            return result;
          })
          .otherwise((unexpectedError) => {
            const result: CreditAdditionUnexpectedError = {
              success: false,
              operationId: 'UnknownError',
              error: unexpectedError
            };
            return result;
          });
      }
    );
  }

  public addCredits(userId: UserId, credits: number): Promise<CreditAdditionResult> {
    return this.userStore.addCredits(userId, credits).then(
      (user) => {
        const creditDeductionOperation: CreditAdditionSuccess = {
          success: true,
          operationId: 'Success',
          subscriptionCreditBalance: user.UserCredits?.SubscriptionCreditBalance || 0
        };
        return creditDeductionOperation;
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
