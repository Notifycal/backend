import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { dynamodbClient } from '@clients/dynamodb';
import { AwsConfig } from '@model/Config';

export abstract class BaseStore<TConfig extends BaseStoreConfig> {
  protected _dynamoDbClient: DynamoDBDocumentClient;
  protected _tableName: string;

  constructor(config: TConfig, awsConfig: AwsConfig) {
    this._dynamoDbClient = dynamodbClient(awsConfig);
    this._tableName = config.tableName;
  }
}

export interface BaseStoreConfig {
  tableName: string;
}
