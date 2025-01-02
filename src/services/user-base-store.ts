import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { User } from '@model/User';
import type { Email } from '@own-types/model';
import { BaseStore, type BaseStoreConfig } from './common/base-store';
import type { AwsConfig } from '@model/Config';

export type UserBaseStoreConfig = BaseStoreConfig;

export class UserBaseStore extends BaseStore<UserBaseStoreConfig> {
  public constructor(config: UserBaseStoreConfig, awsConfig: AwsConfig) {
    super(config, awsConfig);
  }

  public getUserByEmail(email: Email): Promise<User | undefined> {
    const lookupCmd = new GetCommand({
      Key: {
        UserId: email
      },
      TableName: this._tableName
    });
    return this._dynamoDbClient.send(lookupCmd).then(
      (item) => {
        const user = item.Item;
        if (user) {
          return user as User;
        } else {
          return undefined;
        }
      },
      (error) => Promise.reject(`User with id '${email}' could not be retrieved. Error: ${error}`)
    );
  }

  public putUser(user: User): Promise<null> {
    const insertCmd = new PutCommand({
      Item: {
        UserId: user.UserId
      },
      TableName: this._tableName,
      ReturnConsumedCapacity: 'TOTAL'
    });
    return this._dynamoDbClient.send(insertCmd).then(() => {
      return null;
    });
  }
}
