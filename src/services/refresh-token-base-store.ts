import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { AwsConfig } from '@model/Config';
import { UserId, Uuid } from '@own-types/model';
import { BaseStoreConfig, BaseStore } from './common/base-store';
import { RefreshTokenStoreRecord } from '@model/RefreshTokenStoreRecord';

export type RefreshTokenBaseStoreConfig = BaseStoreConfig;

export class RefreshTokenBaseStore extends BaseStore<RefreshTokenBaseStoreConfig> {
  constructor(config: RefreshTokenBaseStoreConfig, awsConfig: AwsConfig) {
    super(config, awsConfig);
  }

  public getTokenBy(userId: UserId, jwtId: Uuid): Promise<RefreshTokenStoreRecord | undefined> {
    const lookupCmd = new GetCommand({
      Key: {
        UserId: userId,
        RefreshTokenId: jwtId
      },
      TableName: this._tableName
    });
    return this._dynamoDbClient.send(lookupCmd).then(
      (item) => {
        const user = item.Item;
        if (user) {
          return user as RefreshTokenStoreRecord;
        } else {
          return undefined;
        }
      },
      (error) =>
        Promise.reject(
          `Tokens stored for user '${userId}' with token id '${jwtId}' could not be retrieved. Error: ${error}`
        )
    );
  }

  public putToken(refreshToken: RefreshTokenStoreRecord): Promise<null> {
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
