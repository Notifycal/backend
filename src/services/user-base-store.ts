import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { UserStoreRecord } from '@model/UserStoreRecord';
import { BaseStore, type BaseStoreConfig } from './common/base-store';
import type { UserId } from '@own-types/model';
import type { IdpName } from '@model/Identity';

export type UserBaseStoreConfig = BaseStoreConfig;

export class UserBaseStore<TIdpName extends IdpName> extends BaseStore<UserBaseStoreConfig> {
  public constructor(config: UserBaseStoreConfig) {
    super(config);
  }

  public getUserById(id: UserId): Promise<UserStoreRecord<TIdpName> | undefined> {
    const lookupCmd = new GetCommand({
      Key: {
        UserId: id
      },
      TableName: this._tableName
    });
    return this._dynamoDbClient.send(lookupCmd).then(
      (item) => {
        const user = item.Item;
        if (user) {
          const u = user as UserStoreRecord<TIdpName>;
          return u.Status !== 'banned' ? u : undefined;
        } else {
          return undefined;
        }
      },
      (error) =>
        Promise.reject(new Error(`User with id '${id}' could not be retrieved. Error: ${error}`))
    );
  }

  public putUser(user: UserStoreRecord<IdpName>): Promise<null> {
    const insertCmd = new PutCommand({
      Item: user,
      TableName: this._tableName,
      ReturnConsumedCapacity: 'TOTAL'
    });
    return this._dynamoDbClient.send(insertCmd).then(() => {
      return null;
    });
  }
}
