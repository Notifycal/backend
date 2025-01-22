import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { UserStoreRecord } from '@model/UserStoreRecord';
import { BaseStore, type BaseStoreConfig } from './common/base-store';
import type { UserId } from '@own-types/model';
import type { IdpName } from '@model/Identity';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';

export type UserBaseStoreConfig = BaseStoreConfig;
export type UserBaseStoreEndpointConfig = { userBaseStoreConfig: UserBaseStoreConfig };

export class UserBaseStore<TIdpName extends IdpName> extends BaseStore<UserBaseStoreConfig> {
  public constructor(config: UserBaseStoreConfig) {
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
    const queryCmd = new QueryCommand({
      TableName: this._tableName,
      KeyConditionExpression: 'UserId = :id',
      ExpressionAttributeValues: {
        ':id': id
      },
      ProjectionExpression: projections.join(', ')
    });

    return this._dynamoDbClient.send(queryCmd).then(
      (result) => {
        const user = result.Items?.[0];
        if (user) {
          const u = user as UserStoreRecord<TIdpName>;
          return u.UserStatus !== 'banned' ? u : undefined;
        }
        return undefined;
      },
      (error) =>
        Promise.reject(new Error(`User with id '${id}' could not be retrieved. Error: ${error}`))
    );
  }

  public putUser(
    user: UserStoreRecord<IdpName>,
    authorization: AuthorizationForIdp<TIdpName>
  ): Promise<null> {
    const insertCmd = new PutCommand({
      Item: { ...user, IdpAuth: authorization },
      TableName: this._tableName,
      ReturnConsumedCapacity: 'TOTAL'
    });
    return this._dynamoDbClient.send(insertCmd).then(() => {
      return null;
    });
  }
}
