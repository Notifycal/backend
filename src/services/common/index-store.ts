import {
  GetCommand,
  paginateQuery,
  type DynamoDBDocumentClient,
  type GetCommandInput,
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
}
