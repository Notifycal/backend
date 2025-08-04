import type { Logger } from '@aws-lambda-powertools/logger';
import type { UpdateCommandOutput } from '@aws-sdk/lib-dynamodb';
import { InsufficientCreditsError } from '@model/Errors';
import type { UserStoreRecordCredits } from '@model/store/UserStoreRecord';
import type { TierId, UserId } from '@notifycal/shared/types';
import { rejectWithMessageAndError, throwError } from '@services/common/error-handling';
import { BaseStore, type BaseStoreConfig } from '../common/base-store';

export interface CreditOperationPersistenceResult {
  user: UserStoreRecordCredits;
  balance: 'subscription' | 'topup';
  quantity: number;
}

export class UserCreditsBaseStore extends BaseStore<BaseStoreConfig> {
  public constructor(config: BaseStoreConfig, logger: Logger) {
    super(config, logger);
  }

  private attemptDeduction(
    userId: UserId,
    amount: number,
    creditType: 'SubscriptionCreditBalance' | 'TopupCreditBalance'
  ): Promise<UpdateCommandOutput> {
    return this.updateCommandRunner({
      Key: { UserId: userId },
      UpdateExpression: `SET Credits.${creditType} = Credits.${creditType} - :amount`,
      ConditionExpression: `attribute_exists(Credits.${creditType}) AND Credits.${creditType} >= :amount`,
      ExpressionAttributeValues: {
        ':amount': amount
      }
    });
  }

  public deductCredits(
    userId: UserId,
    amount: number,
    logger: Logger
  ): Promise<CreditOperationPersistenceResult> {
    return this.attemptDeduction(userId, amount, 'SubscriptionCreditBalance').then(
      (r) => ({
        user: this.handleSuccessfulUpdate(r, logger),
        balance: 'subscription',
        quantity: amount
      }),
      (error) => {
        if (this.isConditionalCheckFailedError(error)) {
          return this.attemptDeduction(userId, amount, 'TopupCreditBalance').then(
            (r) => ({
              user: this.handleSuccessfulUpdate(r, logger),
              balance: 'topup',
              quantity: amount
            }),
            (error) => {
              if (this.isConditionalCheckFailedError(error)) {
                return Promise.reject(
                  new InsufficientCreditsError(
                    `Failed to deduct credits for user '${userId}' - insufficient balance in both subscription and topup`,
                    {},
                    error
                  )
                );
              }
              return rejectWithMessageAndError(`Error while deducting topup credits`, error);
            }
          );
        }
        return rejectWithMessageAndError(`Error while deducting subscription credits`, error);
      }
    );
  }

  public addCredits(
    userId: UserId,
    amount: number,
    balanceType: 'subscription' | 'topup',
    logger: Logger,
    tierId?: TierId
  ): Promise<UserStoreRecordCredits> {
    const creditType =
      balanceType === 'subscription' ? 'SubscriptionCreditBalance' : 'TopupCreditBalance';
    const shouldUpdateTier = balanceType === 'subscription' && tierId !== undefined;

    const updateExpressionParts = [
      `SET Credits.${creditType} = if_not_exists(Credits.${creditType}, :zero) + :amount`,
      ...(shouldUpdateTier ? ['Credits.Tier = :tierId', 'Credits.UsableTierCredits = Credits.UsableTierCredits + :usableTierCredits'] : [])
    ];
    const expressionAttributeValues = {
      ':amount': amount,
      ':zero': 0,
      ...(shouldUpdateTier ? { ':tierId': tierId, ':usableTierCredits': amount } : {})
    };
    return this.updateCommandRunner({
      Key: { UserId: userId },
      UpdateExpression: updateExpressionParts.join(', '),
      ConditionExpression: 'attribute_exists(Credits)',
      ExpressionAttributeValues: expressionAttributeValues
    })
      .then((r) => this.handleSuccessfulUpdate(r, logger))
      .catch((error: unknown) => {
        if (this.isConditionalCheckFailedError(error)) {
          return rejectWithMessageAndError(
            `Failed to add credits for user '${userId}' - Credits field does not exist`,
            error
          );
        }
        return rejectWithMessageAndError(`Error while adding ${balanceType} credits`, error);
      });
  }

  public resetSubscriptionCredits(
    userId: UserId,
    tierId: TierId,
    amount: number,
    logger: Logger
  ): Promise<UserStoreRecordCredits> {
    return this.updateCommandRunner({
      Key: { UserId: userId },
      UpdateExpression: 'SET Credits.SubscriptionCreditBalance = :amount, Credits.Tier = :tierId, Credits.UsableTierCredits = :usableTierCredits',
      ConditionExpression: 'attribute_exists(Credits)',
      ExpressionAttributeValues: {
        ':amount': amount,
        ':tierId': tierId,
        ':usableTierCredits': amount,
      }
    })
      .then((r) => this.handleSuccessfulUpdate(r, logger))
      .catch((error) => {
        if (!this.isConditionalCheckFailedError(error)) {
          return rejectWithMessageAndError(
            `Error while reseting subscription credits. First go`,
            error
          );
        }
        return this.updateCommandRunner({
          Key: { UserId: userId },
          UpdateExpression: 'SET Credits = :credits',
          ExpressionAttributeValues: {
            ':credits': {
              SubscriptionCreditBalance: amount,
              UsableTierCredits: amount,
              Tier: tierId,
              TopupCreditBalance: 0
            }
          }
        }).then(
          (r) => this.handleSuccessfulUpdate(r, logger),
          this.handleError(`Error while reseting subscription credits. Second go`)
        );
      });
  }

  public clearSubscriptionCredits(userId: UserId, logger: Logger): Promise<UserStoreRecordCredits> {
    return this.updateCommandRunner({
      Key: { UserId: userId },
      UpdateExpression: 'REMOVE Credits.SubscriptionCreditBalance, Credits.Tier, Credits.UsableTierCredits'
    }).then(
      (r) => this.handleSuccessfulUpdate(r, logger),
      this.handleError(`Error while clearing subscription credits`)
    );
  }

  private handleSuccessfulUpdate(
    output: UpdateCommandOutput,
    logger: Logger
  ): UserStoreRecordCredits {
    const updatedUser = output.Attributes as
      | { Credits?: UserStoreRecordCredits['Credits'] }
      | undefined;
    if (updatedUser && updatedUser.Credits) {
      return {
        Credits: {
          ...updatedUser.Credits,
          SubscriptionCreditBalance: updatedUser.Credits.SubscriptionCreditBalance ?? 0,
          TopupCreditBalance: updatedUser.Credits.TopupCreditBalance ?? 0
        }
      };
    } else {
      throwError('Unexpected error while updating credits from persistance', logger);
    }
  }

  private handleError(message: string): (error: unknown) => Promise<never> {
    return (error: unknown) => rejectWithMessageAndError(message, error);
  }
}
