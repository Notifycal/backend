import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { dynamodbClient } from '@clients/dynamodb';

export interface BaseStoreConfig {
  tableName: string;
}

export abstract class BaseStore<TConfig extends BaseStoreConfig> {
  protected _dynamoDbClient: DynamoDBDocumentClient;
  protected _tableName: string;

  public constructor(config: TConfig) {
    this._dynamoDbClient = dynamodbClient();
    this._tableName = config.tableName;
  }
}
