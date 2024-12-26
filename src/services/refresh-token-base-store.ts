import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { AwsConfig } from '@model/Config';
import { UserId, Uuid } from '@own-types/model';
import { BaseStoreConfig, BaseStore } from './common/base-store';
import { RefreshToken } from '@model/RefreshToken';

export type RefreshTokenBaseStoreConfig = BaseStoreConfig;

export class RefreshTokenBaseStore extends BaseStore<RefreshTokenBaseStoreConfig> {
  constructor(config: RefreshTokenBaseStoreConfig, awsConfig: AwsConfig) {
    super(config, awsConfig);
  }

  public getTokenBy(userId: UserId, jwtId: Uuid): Promise<RefreshToken> {
    const lookupCmd = new GetCommand({
      Key: {
        UserId: userId,
        RefreshTokenId: jwtId
      },
      TableName: this._tableName
    });
    return this._dynamoDbClient.send(lookupCmd).then((item) => {
      const user = item.Item as RefreshToken;
      if (user) {
        return user;
      } else {
        throw new Error(`There are no tokens stored for user '${userId}' with token id '${jwtId}'`);
      }
    });
  }

  public putToken(refreshToken: RefreshToken): Promise<null> {
    const insertCmd = new PutCommand({
      Item: refreshToken,
      TableName: this._tableName,
      ReturnConsumedCapacity: 'TOTAL'
    });
    return this._dynamoDbClient.send(insertCmd).then(() => {
      return null;
    });
  }
}
