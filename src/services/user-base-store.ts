import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { User } from '@model/User';
import { Email } from '@own-types/model';
import { BaseStore, BaseStoreConfig } from './common/base-store';
import { AwsConfig } from '@model/Config';

export type UserBaseStoreConfig = BaseStoreConfig;

export class UserBaseStore extends BaseStore<UserBaseStoreConfig> {
  constructor(config: UserBaseStoreConfig, awsConfig: AwsConfig) {
    super(config, awsConfig);
  }

  public getUserByEmail(email: Email): Promise<User> {
    const lookupCmd = new GetCommand({
      Key: {
        UserId: email
      },
      TableName: this._tableName
    });
    return this._dynamoDbClient.send(lookupCmd).then((item) => {
      const user = item.Item as User;
      if (user.UserId) {
        return user;
      } else {
        throw new Error(`User with id '${email}' could not be found`);
      }
    });
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
