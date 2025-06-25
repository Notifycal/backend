import {
  paginateQuery,
  QueryCommand,
  type DynamoDBDocumentClient,
  type QueryCommandInput
} from '@aws-sdk/lib-dynamodb';
import { dynamodbClient } from '@clients/dynamodb';

export interface IndexStoreConfig {
  tableName: string;
  indexName: string;
  pageSize: number;
}

export abstract class IndexStore<TConfig extends IndexStoreConfig> {
  protected _dynamoDbClient: DynamoDBDocumentClient;
  protected _tableName: string;
  protected _indexName: string;
  protected _pageSize: number;

  public constructor(config: TConfig) {
    this._dynamoDbClient = dynamodbClient();
    this._tableName = config.tableName;
    this._indexName = config.indexName;
    this._pageSize = config.pageSize;
  }

  protected getCommandRunner<T>(
    cmdInput: Omit<QueryCommandInput, 'TableName' | 'IndexName'>
  ): Promise<T | undefined> {
    return this._dynamoDbClient
      .send(
        new QueryCommand({
          TableName: this._tableName,
          IndexName: this._indexName,
          Limit: 1,
          ...cmdInput
        })
      )
      .then((result) => {
        if (result.Items && result.Items.length > 0) {
          return result.Items[0] as T;
        }
        return undefined;
      });
  }

  protected async *queryCommandRunner<T>(
    cmdInput: Omit<QueryCommandInput, 'TableName' | 'IndexName'> & Partial<QueryCommandInput>
  ): AsyncGenerator<T, void, void> {
    const paginatorConfig = {
      client: this._dynamoDbClient,
      pageSize: this._pageSize
    };

    const queryCommand = {
      TableName: this._tableName,
      IndexName: this._indexName,
      ...cmdInput
    };

    const paginator = paginateQuery(paginatorConfig, queryCommand);

    for await (const page of paginator) {
      yield page.Items as T;
    }
  }
}
