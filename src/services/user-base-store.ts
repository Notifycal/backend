import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { User } from '@model/User';
import { BaseStore, type BaseStoreConfig } from './common/base-store';
import type { UserId } from '@own-types/model';

export type UserBaseStoreConfig = BaseStoreConfig;

export class UserBaseStore extends BaseStore<UserBaseStoreConfig> {
  public constructor(config: UserBaseStoreConfig) {
    super(config);
  }

  public getUserById(id: UserId): Promise<User | undefined> {
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
          const u = user as User;
          return u.Status !== 'banned' ? u : undefined;
        } else {
          return undefined;
        }
      },
      (error) =>
        Promise.reject(new Error(`User with id '${id}' could not be retrieved. Error: ${error}`))
    );
  }

  public putUser(user: User): Promise<null> {
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
