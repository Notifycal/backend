import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
  type GetCommandInput,
  type PutCommandInput,
  type QueryCommandInput,
  type UpdateCommandInput
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
      .then((result) => {
        const item = result.Item;
        if (item) {
          return item as T;
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
        const item = result.Items?.[0];
        if (item) {
          return item as T;
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

  protected updateCommandRunner(
    cmd: Required<Pick<UpdateCommandInput, 'Key'>> &
      Required<Pick<UpdateCommandInput, 'UpdateExpression'>> &
      Required<Pick<UpdateCommandInput, 'ExpressionAttributeValues'>> &
      Partial<UpdateCommandInput> &
      Omit<UpdateCommandInput, 'TableName'>
  ): Promise<null> {
    const command = new UpdateCommand({
      TableName: this._tableName,
      ReturnConsumedCapacity: 'TOTAL',
      ReturnValues: 'ALL_NEW',
      ...cmd
    });
    return this._dynamoDbClient.send(command).then((item) => {
      console.warn(`these are the returned values ${JSON.stringify(item)}`);
      return null;
    });
  }
}
