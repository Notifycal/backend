import type { Logger } from '@aws-lambda-powertools/logger';
import type { UpdateCommandOutput } from '@aws-sdk/lib-dynamodb';
import { InsufficientCreditsError } from '@model/Errors';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { TierId, TopupId } from '@model/PaymentPlans';
import type { ReminderConfigStoreRecord } from '@model/store/ReminderConfigStoreRecord';
import type { UserIdpAuthorizationStoreRecord } from '@model/store/UserIdpAuthorizationStoreRecord';
import type { CreditBalanceType, UserStoreRecord } from '@model/store/UserStoreRecord';
import type {
  IdpName,
  LanguageCode,
  StripeCustomerId,
  UserId,
  UserStatus
} from '@notifycal/shared/types';
import { throwError } from '@services/common/error-handling';
import { match } from 'ts-pattern';
import { BaseStore, type BaseStoreConfig } from '../common/base-store';

export type UserBaseStoreConfig = BaseStoreConfig;
export type UserBaseStoreEndpointConfig = { userBaseStoreConfig: UserBaseStoreConfig };

export class UserBaseStore<TIdpName extends IdpName> extends BaseStore<UserBaseStoreConfig> {
  public static withConfig<TIdpName extends IdpName>(
    config: UserBaseStoreConfig,
    logger: Logger
  ): UserBaseStore<TIdpName> {
    return new UserBaseStore<TIdpName>(config, logger);
  }

  private constructor(config: UserBaseStoreConfig, logger: Logger) {
    super(config, logger);
  }

  public getUserById(id: UserId): Promise<UserStoreRecord<TIdpName> | undefined> {
    const projections: Array<keyof UserStoreRecord<TIdpName>> = [
      'UserId',
      'Email',
      'Idp',
      'IdpId',
      'LastSignInAt',
      'SignedUpAt',
      'UserStatus',
      'Config',
      'StripeCustomerId',
      'Credits'
    ];
    const queryCmdInput = {
      KeyConditionExpression: 'UserId = :id',
      ExpressionAttributeValues: {
        ':id': id
      },
      ProjectionExpression: projections.join(', ')
    };

    return this.queryCommandRunner<UserStoreRecord<TIdpName>>(queryCmdInput).then(
      (user) => {
        if (user && user.UserStatus !== 'banned') {
          return user;
        } else {
          return undefined;
        }
      },
      (error) =>
        Promise.reject(new Error(`User with id '${id}' could not be retrieved`, { cause: error }))
    );
  }

  public getIdpAuthorization(id: UserId): Promise<AuthorizationForIdp<TIdpName> | undefined> {
    const projections: Array<keyof UserIdpAuthorizationStoreRecord<TIdpName>> = [
      'IdpAuthorization'
    ];
    const queryCmd = {
      KeyConditionExpression: 'UserId = :id',
      ExpressionAttributeValues: {
        ':id': id
      },
      ProjectionExpression: projections.join(', ')
    };

    return this.queryCommandRunner<UserIdpAuthorizationStoreRecord<TIdpName>>(queryCmd)
      .then((record) => record?.IdpAuthorization)
      .catch((error) =>
        Promise.reject(
          new Error(`Idp authorization for user id '${id}' could not be retrieved`, {
            cause: error
          })
        )
      );
  }

  public getUserConfigById(
    userId: UserId
  ): Promise<UserStoreRecord<IdpName>['Config'] | undefined> {
    const projections: Array<keyof UserStoreRecord<IdpName>> = ['Config'];
    const getCommand = {
      Key: {
        UserId: userId
      },
      FilterExpression: 'attribute_exists(Config) AND size(Config) > :configMinSize',
      ExpressionAttributeValues: {
        ':configMinSize': 0
      },
      ProjectionExpression: projections.join(', ')
    };

    return super
      .getCommandRunner<UserStoreRecord<IdpName>>(getCommand)
      .then((result) => result?.Config);
  }

  public getStripeCustomerId(userId: UserId): Promise<StripeCustomerId | undefined> {
    return this.getUserById(userId).then((user) => user?.StripeCustomerId);
  }

  // This will makes sense in terms of cost until row exceed 4KB - this is due to DynamoDb billing rules
  public getEmailAndLanguageById(
    userId: UserId
  ): Promise<(Pick<UserStoreRecord<TIdpName>, 'Email'> & { Language: LanguageCode }) | undefined> {
    return this.getUserById(userId).then((user) => {
      if (user && user.Config) {
        return {
          Email: user.Email,
          Language: user.Config.Business.Language
        };
      } else {
        return undefined;
      }
    });
  }

  public putUser(
    user: UserStoreRecord<IdpName>,
    authorization: AuthorizationForIdp<TIdpName>
  ): Promise<null> {
    return this.putCommandRunner({
      Item: { ...user, IdpAuthorization: authorization }
    });
  }

  public updateUser(
    id: UserId,
    status: UserStatus,
    config: ReminderConfigStoreRecord
  ): Promise<null> {
    return this.updateCommandRunner({
      Key: {
        UserId: id
      },
      ExpressionAttributeValues: {
        ':userStatus': status,
        ':config': config
      },
      UpdateExpression: 'set UserStatus = :userStatus, Config = :config'
    }).then(() => null);
  }

  public setStripeCustomerId(id: UserId, stripeCustomerId: StripeCustomerId): Promise<null> {
    return this.updateCommandRunner({
      Key: {
        UserId: id
      },
      ExpressionAttributeValues: {
        ':stripeCustomerId': stripeCustomerId
      },
      UpdateExpression: 'set StripeCustomerId = :stripeCustomerId'
    }).then(() => null);
  }

  public updateStatus(id: UserId, status: UserStatus): Promise<null> {
    return this.updateCommandRunner({
      Key: {
        UserId: id
      },
      ExpressionAttributeValues: {
        ':userStatus': status
      },
      UpdateExpression: 'set UserStatus = :userStatus'
    }).then(() => null);
  }

  //TODO topups
  public deductCredits(
    userId: UserId,
    amount: number,
    logger: Logger
  ): Promise<Required<Pick<UserStoreRecord<TIdpName>, 'Credits'>>> {
    return this.updateCommandRunner({
      Key: { UserId: userId },
      UpdateExpression:
        'SET Credits.SubscriptionCreditBalance = Credits.SubscriptionCreditBalance - :amount',
      ConditionExpression:
        'attribute_exists(Credits.SubscriptionCreditBalance) AND Credits.SubscriptionCreditBalance >= :amount',
      ExpressionAttributeValues: {
        ':amount': amount
      }
    }).then(
      (r) => this.handleSuccessfulUpdate(r, logger),
      (error) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (error.name === 'ConditionalCheckFailedException') {
          return Promise.reject(
            new InsufficientCreditsError(`Failed to deduct credits for user '${userId}'`, {}, error)
          );
        }
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        return Promise.reject(error);
      }
    );
  }

  public addCredits(
    userId: UserId,
    amount: number,
    product: { type: 'subscription'; id: TierId } | { type: 'topup'; id: TopupId },
    logger: Logger
  ): Promise<Required<Pick<UserStoreRecord<TIdpName>, 'Credits'>>> {
    const productConfig = match(product)
      .with({ type: 'subscription' }, (p) => ({
        creditType: 'SubscriptionCreditBalance' as CreditBalanceType,
        shouldUpdateTier: true,
        tierId: p.id
      }))
      .with({ type: 'topup' }, () => ({
        creditType: 'TopupCreditBalance' as CreditBalanceType,
        shouldUpdateTier: false,
        tierId: undefined
      }))
      .exhaustive();
    const updateExpressionParts = [
      `SET Credits.${productConfig.creditType} = if_not_exists(Credits.${productConfig.creditType}, :zero) + :amount`,
      ...(productConfig.shouldUpdateTier ? ['Credits.Tier = :tierId'] : [])
    ];
    const expressionAttributeValues = {
      ':amount': amount,
      ':zero': 0,
      ...(productConfig.shouldUpdateTier ? { ':tierId': productConfig.tierId } : {})
    };
    return this.updateCommandRunner({
      Key: { UserId: userId },
      UpdateExpression: updateExpressionParts.join(', '),
      ConditionExpression: 'attribute_exists(Credits)',
      ExpressionAttributeValues: expressionAttributeValues
    })
      .then((r) => this.handleSuccessfulUpdate(r, logger))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
          throw new Error(
            `Failed to add credits for user '${userId}' - Credits field does not exist`,
            { cause: error }
          );
        }
        throw error;
      });
  }

  public resetSubscriptionCredits(
    userId: UserId,
    tierId: TierId,
    amount: number,
    logger: Logger
  ): Promise<Required<Pick<UserStoreRecord<TIdpName>, 'Credits'>>> {
    return this.updateCommandRunner({
      Key: { UserId: userId },
      UpdateExpression: 'SET Credits.SubscriptionCreditBalance = :amount, Credits.Tier = :tierId',
      ConditionExpression: 'attribute_exists(Credits)',
      ExpressionAttributeValues: {
        ':amount': amount,
        ':tierId': tierId
      }
    })
      .then((r) => this.handleSuccessfulUpdate(r, logger))
      .catch((error) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (error.name !== 'ConditionalCheckFailedException') {
          throw error;
        }
        return this.updateCommandRunner({
          Key: { UserId: userId },
          UpdateExpression: 'SET Credits = :credits',
          ExpressionAttributeValues: {
            ':credits': {
              SubscriptionCreditBalance: amount,
              Tier: tierId,
              TopupCreditBalance: 0
            }
          }
        }).then((r) => this.handleSuccessfulUpdate(r, logger));
      });
  }

  public clearSubscriptionCredits(
    userId: UserId,
    logger: Logger
  ): Promise<Required<Pick<UserStoreRecord<TIdpName>, 'Credits'>>> {
    return this.updateCommandRunner({
      Key: { UserId: userId },
      UpdateExpression: 'REMOVE Credits.SubscriptionCreditBalance, Credits.Tier'
    }).then((r) => this.handleSuccessfulUpdate(r, logger));
  }

  private handleSuccessfulUpdate(
    output: UpdateCommandOutput,
    logger: Logger
  ): Required<Pick<UserStoreRecord<TIdpName>, 'Credits'>> {
    const updatedUser = output.Attributes as UserStoreRecord<TIdpName> | undefined;
    if (updatedUser && updatedUser.Credits) {
      return { Credits: updatedUser.Credits };
    } else {
      throwError('Unexpected error while updating credits from persistance', logger);
    }
  }
}
