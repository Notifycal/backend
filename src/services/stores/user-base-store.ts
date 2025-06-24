import type { UpdateCommandOutput } from '@aws-sdk/lib-dynamodb';
import { InsufficientCreditsError } from '@model/Errors';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { ReminderConfigStoreRecord } from '@model/store/ReminderConfigStoreRecord';
import type { UserIdpAuthorizationStoreRecord } from '@model/store/UserIdpAuthorizationStoreRecord';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type {
  IdpName,
  LanguageCode,
  StripeCustomerId,
  UserId,
  UserStatus
} from '@notifycal/shared/types';
import { throwError } from '@services/common/error-handling';
import { BaseStore, type BaseStoreConfig } from '../common/base-store';

export type UserBaseStoreConfig = BaseStoreConfig;
export type UserBaseStoreEndpointConfig = { userBaseStoreConfig: UserBaseStoreConfig };

export class UserBaseStore<TIdpName extends IdpName> extends BaseStore<UserBaseStoreConfig> {
  public static withConfig<TIdpName extends IdpName>(
    config: UserBaseStoreConfig
  ): UserBaseStore<TIdpName> {
    return new UserBaseStore<TIdpName>(config);
  }

  private constructor(config: UserBaseStoreConfig) {
    super(config);
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
      'StripeCustomerId'
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
    return this.getUserById(userId).then((user) => (user ? user.StripeCustomerId : undefined));
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

  public updateStripeCustomerId(id: UserId, stripeCustomerId: StripeCustomerId): Promise<null> {
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

  public deductCredits(
    userId: UserId,
    amount: number
  ): Promise<Pick<UserStoreRecord<TIdpName>, 'UserCredits'>> {
    return this.updateCommandRunner({
      Key: { UserId: userId },
      UpdateExpression:
        'SET Credits.subscriptionCreditBalance = Credits.subscriptionCreditBalance - :amount',
      ConditionExpression:
        'attribute_exists(Credits.subscriptionCreditBalance) AND Credits.subscriptionCreditBalance >= :amount',
      ExpressionAttributeValues: {
        ':amount': amount
      }
    }).then(
      (r) => this.handleSuccessfulUpdate(r),
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

  public async resetSubscriptionCredits(
    userId: UserId,
    amount: number
  ): Promise<Pick<UserStoreRecord<TIdpName>, 'UserCredits'>> {
    return this.updateCommandRunner({
      Key: { UserId: userId },
      UpdateExpression: 'SET Credits = :creditsObj',
      ExpressionAttributeValues: {
        ':creditsObj': {
          subscriptionCreditBalance: amount
        }
      }
    }).then((r) => this.handleSuccessfulUpdate(r));
  }

  private handleSuccessfulUpdate(
    output: UpdateCommandOutput
  ): Pick<UserStoreRecord<TIdpName>, 'UserCredits'> {
    if (output.Attributes) {
      const updatedUser = output.Attributes as UserStoreRecord<TIdpName>;
      return { UserCredits: updatedUser.UserCredits };
    } else {
      throwError('Unexpected error while updating credits from persistance');
    }
  }
}
