import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { dynamodbClient } from '@clients/dynamodb';
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { AwsConfig } from 'model/AwsConfig';
import { User } from 'model/User';
import { Email } from 'types/model';

export interface UserProviderConfig {
  tableName: string;
  awsConfig: AwsConfig;
}

export class UserProvider {
  private _dynamoDbClient: DynamoDBClient;
  private _tableName: string;

  constructor(config: UserProviderConfig) {
    this._dynamoDbClient = dynamodbClient(config.awsConfig);
    this._tableName = config.tableName;
  }

  public getUserByEmail(email: Email): Promise<User> {
    const lookupCmd = new GetCommand({
      Key: {
        UserId: email
      },
      TableName: this._tableName
    });
    return this._dynamoDbClient.send(lookupCmd).then((item) => {
      if (item.Item?.['UserId']['S'])
        return { email: item.Item?.['UserId']['S'] } as unknown as User;
      else {
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
