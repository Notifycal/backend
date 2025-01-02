import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { dynamodbClient } from '@clients/dynamodb';
import type { AwsConfig } from '@model/Config';

export interface BaseStoreConfig {
  tableName: string;
}

export abstract class BaseStore<TConfig extends BaseStoreConfig> {
  protected _dynamoDbClient: DynamoDBDocumentClient;
  protected _tableName: string;

  public constructor(config: TConfig, awsConfig: AwsConfig) {
    this._dynamoDbClient = dynamodbClient(awsConfig);
    this._tableName = config.tableName;
  }
}