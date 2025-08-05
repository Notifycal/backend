import type { Logger } from '@aws-lambda-powertools/logger';
import type { UpdateCommandOutput } from '@aws-sdk/lib-dynamodb';
import { InsufficientCreditsError } from '@model/Errors';
import type { UserCreditsRecordStore, UserStoreRecordCredits } from '@model/store/UserStoreRecord';
import type { TierId, UserId } from '@notifycal/shared/types';
import {
  extractErrorMessage,
  rejectWithMessageAndError,
  throwError
} from '@services/common/error-handling';
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
        user: this.handleSuccessfulUpdate(r, userId, logger),
        balance: 'subscription',
        quantity: amount
      }),
      (error) => {
        if (this.isConditionalCheckFailedError(error)) {
          return this.attemptDeduction(userId, amount, 'TopupCreditBalance').then(
            (r) => ({
              user: this.handleSuccessfulUpdate(r, userId, logger),
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
              return this.handleError(`Error while deducting topup credits`)(error);
            }
          );
        }
        return this.handleError(`Error while deducting subscription credits`)(error);
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
    return balanceType === 'subscription'
      ? this.addSubscriptionCredits(userId, amount, tierId!, logger)
      : this.addTopupCredits(userId, amount, logger);
  }

  private addSubscriptionCredits(
    userId: UserId,
    amount: number,
    tierId: TierId,
    logger: Logger
  ): Promise<UserStoreRecordCredits> {
    return this.getCommandRunner<UserStoreRecordCredits>({
      Key: { UserId: userId }
    }).then((currentUser) => {
      const { SubscriptionCreditBalance, UsableTierCredits } = this.validateCreditsExist(
        currentUser?.Credits,
        userId,
        logger
      );
      const creditsUsed = UsableTierCredits - SubscriptionCreditBalance;
      const newSubscriptionBalance = amount - creditsUsed;

      return this.executeUpdateWithErrorHandling(
        {
          Key: { UserId: userId },
          UpdateExpression:
            'SET Credits.SubscriptionCreditBalance = :newBalance, Credits.Tier = :tierId, Credits.UsableTierCredits = :amount',
          ConditionExpression: 'attribute_exists(Credits)',
          ExpressionAttributeValues: {
            ':newBalance': newSubscriptionBalance,
            ':tierId': tierId,
            ':amount': amount
          }
        },
        userId,
        'subscription',
        logger
      );
    });
  }

  private addTopupCredits(
    userId: UserId,
    amount: number,
    logger: Logger
  ): Promise<UserStoreRecordCredits> {
    return this.executeUpdateWithErrorHandling(
      {
        Key: { UserId: userId },
        UpdateExpression:
          'SET Credits.TopupCreditBalance = if_not_exists(Credits.TopupCreditBalance, :zero) + :amount',
        ConditionExpression: 'attribute_exists(Credits)',
        ExpressionAttributeValues: {
          ':amount': amount,
          ':zero': 0
        }
      },
      userId,
      'topup',
      logger
    );
  }

  private executeUpdateWithErrorHandling(
    updateCommand: Parameters<typeof this.updateCommandRunner>[0],
    userId: UserId,
    creditType: 'subscription' | 'topup',
    logger: Logger
  ): Promise<UserStoreRecordCredits> {
    return this.updateCommandRunner(updateCommand)
      .then((r) => this.handleSuccessfulUpdate(r, userId, logger))
      .catch((error: unknown) => {
        if (this.isConditionalCheckFailedError(error)) {
          return rejectWithMessageAndError(
            `Failed to add ${creditType} credits for user '${userId}' - Credits field does not exist`,
            error
          );
        }
        return this.handleError(`Error while adding ${creditType} credits`)(error);
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
      UpdateExpression:
        'SET Credits.SubscriptionCreditBalance = :amount, Credits.Tier = :tierId, Credits.UsableTierCredits = :usableTierCredits',
      ConditionExpression: 'attribute_exists(Credits)',
      ExpressionAttributeValues: {
        ':amount': amount,
        ':tierId': tierId,
        ':usableTierCredits': amount
      }
    })
      .then((r) => this.handleSuccessfulUpdate(r, userId, logger))
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
          (r) => this.handleSuccessfulUpdate(r, userId, logger),
          this.handleError(`Error while reseting subscription credits. Second go`)
        );
      });
  }

  public clearSubscriptionCredits(userId: UserId, logger: Logger): Promise<UserStoreRecordCredits> {
    return this.updateCommandRunner({
      Key: { UserId: userId },
      UpdateExpression:
        'REMOVE Credits.SubscriptionCreditBalance, Credits.Tier, Credits.UsableTierCredits'
    }).then(
      (r) => this.handleSuccessfulUpdate(r, userId, logger),
      this.handleError(`Error while clearing subscription credits`)
    );
  }

  private handleSuccessfulUpdate(
    output: UpdateCommandOutput,
    userId: UserId,
    logger: Logger = this.logger
  ): UserStoreRecordCredits {
    const updatedUser = output.Attributes as
      | { Credits?: UserStoreRecordCredits['Credits'] }
      | undefined;
    const credits = this.validateCreditsExist(updatedUser?.Credits, userId, logger);
    return {
      Credits: {
        ...credits,
        SubscriptionCreditBalance: credits.SubscriptionCreditBalance ?? 0,
        TopupCreditBalance: credits.TopupCreditBalance ?? 0
      }
    };
  }

  private validateCreditsExist(
    creditsMaybe: UserCreditsRecordStore | undefined,
    userId: UserId,
    logger: Logger
  ): UserCreditsRecordStore {
    if (!creditsMaybe) {
      throwError(
        `Unexpected error while updating credits from persistance for user '${userId}'. Credits field does not exist.`,
        logger,
        { creditsMaybe }
      );
    }
    return creditsMaybe;
  }

  private handleError(message: string): (error: unknown) => Promise<never> {
    return (error: unknown) => {
      this.logger.error(`An error ocurred in UserCreditsBaseStore`, {
        error,
        message: extractErrorMessage(error)
      });
      return rejectWithMessageAndError(message, error);
    };
  }
}
