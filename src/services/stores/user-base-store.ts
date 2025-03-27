import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { ReminderConfigStoreRecord } from '@model/store/ReminderConfigStoreRecord';
import type { UserIdpAuthorizationStoreRecord } from '@model/store/UserIdpAuthorizationStoreRecord';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type { IdpName, UserId, UserStatus } from '@notifycal/shared/types';
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
      'UserStatus'
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
        Promise.reject(new Error(`User with id '${id}' could not be retrieved. Error: ${error}`))
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
          new Error(`Idp authorization for user id '${id}' could not be retrieved. Error: ${error}`)
        )
      );
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
    });
  }
}
