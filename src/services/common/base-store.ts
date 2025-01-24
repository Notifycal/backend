import {
  type QueryCommandInput,
  PutCommand,
  QueryCommand,
  type PutCommandInput,
  type DynamoDBDocumentClient,
  GetCommand,
  type GetCommandInput
} from '@aws-sdk/lib-dynamodb';
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

  protected getCommandRunner<T>(
    cmdInput: Omit<GetCommandInput, 'TableName'> & Partial<GetCommandInput>
  ): Promise<T | undefined> {
    return this._dynamoDbClient
      .send(
        new GetCommand({
          TableName: this._tableName,
          ...cmdInput
        })
      )
      .then((item) => {
        const user = item.Item;
        if (user) {
          return user as T;
        } else {
          return undefined;
        }
      });
  }

  protected queryCommandRunner<T>(
    cmdInput: Omit<QueryCommandInput, 'TableName'> & Partial<QueryCommandInput>
  ): Promise<T | undefined> {
    return this._dynamoDbClient
      .send(
        new QueryCommand({
          TableName: this._tableName,
          ...cmdInput
        })
      )
      .then((result) => {
        const r = result.Items?.[0];
        if (r) {
          return r as T;
        }
        return undefined;
      });
  }

  protected putCommandRunner(
    cmd: Required<Pick<PutCommandInput, 'Item'>> &
      Partial<PutCommandInput> &
      Omit<PutCommandInput, 'TableName'>
  ): Promise<null> {
    const command = new PutCommand({
      TableName: this._tableName,
      ReturnConsumedCapacity: 'TOTAL',
      ...cmd
    });
    return this._dynamoDbClient.send(command).then(() => {
      return null;
    });
  }
}
