import type { Logger } from '@aws-lambda-powertools/logger';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { ReminderConfigStoreRecord } from '@model/store/ReminderConfigStoreRecord';
import type { UserIdpAuthorizationStoreRecord } from '@model/store/UserIdpAuthorizationStoreRecord';
import type { UserStoreRecord, UserStoreRecordCredits } from '@model/store/UserStoreRecord';
import type {
  IdpName,
  LanguageCode,
  StripeCustomerId,
  TierId,
  UserId,
  UserStatus
} from '@notifycal/shared/types';
import { rejectWithMessageAndError } from '@services/common/error-handling';
import { BaseStore, type BaseStoreConfig } from '../common/base-store';
import {
  UserCreditsBaseStore,
  type CreditOperationPersistenceResult
} from './user-credits-base-store';
import { UserDemoReminderService } from './user-demo-reminder-service';

export type UserBaseStoreConfig = BaseStoreConfig;
export type UserBaseStoreEndpointConfig = { userBaseStoreConfig: UserBaseStoreConfig };
export type { CreditOperationPersistenceResult } from './user-credits-base-store';

export class UserBaseStore<TIdpName extends IdpName> extends BaseStore<UserBaseStoreConfig> {
  private readonly userCreditsBaseStore: UserCreditsBaseStore;
  private readonly demoReminderService: UserDemoReminderService<TIdpName>;

  public static withConfig<TIdpName extends IdpName>(
    config: UserBaseStoreConfig,
    logger: Logger
  ): UserBaseStore<TIdpName> {
    return new UserBaseStore<TIdpName>(config, logger);
  }

  private constructor(config: UserBaseStoreConfig, logger: Logger) {
    super(config, logger);
    this.userCreditsBaseStore = new UserCreditsBaseStore(config, logger);
    this.demoReminderService = new UserDemoReminderService(config, logger);
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
      'Credits',
      'DemoReminderCount'
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
      (error) => rejectWithMessageAndError(`User with id '${id}' could not be retrieved`, error)
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
        rejectWithMessageAndError(
          `Idp authorization for user id '${id}' could not be retrieved`,
          error
        )
      );
  }

  public getUserConfigAndDemoReminderCount(
    userId: UserId
  ): Promise<Required<Pick<UserStoreRecord<IdpName>, 'Config' | 'DemoReminderCount'>> | undefined> {
    return this.getUserById(userId).then((user) => {
      if (user?.Config) {
        return {
          Config: user.Config,
          DemoReminderCount: user.DemoReminderCount ?? 0
        };
      }
      return undefined;
    });
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

  public deductCredits(
    userId: UserId,
    amount: number,
    logger: Logger
  ): Promise<CreditOperationPersistenceResult> {
    return this.userCreditsBaseStore.deductCredits(userId, amount, logger);
  }

  public addCredits(
    userId: UserId,
    amount: number,
    balanceType: 'subscription' | 'topup',
    logger: Logger,
    tierId?: TierId
  ): Promise<UserStoreRecordCredits> {
    return this.userCreditsBaseStore.addCredits(userId, amount, balanceType, logger, tierId);
  }

  public resetSubscriptionCredits(
    userId: UserId,
    tierId: TierId,
    amount: number,
    logger: Logger
  ): Promise<UserStoreRecordCredits> {
    return this.userCreditsBaseStore.resetSubscriptionCredits(userId, tierId, amount, logger);
  }

  public clearSubscriptionCredits(userId: UserId, logger: Logger): Promise<UserStoreRecordCredits> {
    return this.userCreditsBaseStore.clearSubscriptionCredits(userId, logger);
  }

  public incrementDemoReminderCount(
    userId: UserId,
    demoReminderLimit: number
  ): Promise<{ DemoReminderCount: number }> {
    return this.demoReminderService.incrementDemoReminderCount(userId, demoReminderLimit);
  }

  public decrementDemoReminderCount(userId: UserId): Promise<{ DemoReminderCount: number }> {
    return this.demoReminderService.decrementDemoReminderCount(userId);
  }
}
