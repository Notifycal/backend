import type { EventBridgeEvent } from 'aws-lambda';

import { QueryCommand } from '@aws-sdk/client-dynamodb';
import type { QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { dynamodbClient } from '@clients/dynamodb';
import { readEnv } from '@services/common/config';

const dynamoDbClient = dynamodbClient();

async function lambdaHandler(event: EventBridgeEvent<'Scheduled event', string>): Promise<void> {
  console.log('Lambda event: ');
  console.log(JSON.stringify(event, null, 2));

  // const TABLE_NAME = process.env.USERS_TABLE_NAME;
  // const TABLE_INDEX_NAME = process.env.LOCAL_USERS_INDEX_NAME;
  // const TOPIC_NAME = process.env.FETCH_CALENDARS_TOPIC_NAME;

  const env = readEnv();
  const TABLE_NAME = env.get('USERS_TABLE_NAME').required().asString();
  const TABLE_INDEX_NAME = env.get('LOCAL_USERS_INDEX_NAME').required().asString();
  const TOPIC_NAME = env.get('FETCH_CALENDARS_TOPIC_NAME').required().asString();

  console.log('Table Name', TABLE_NAME);
  console.log('Index Name', TABLE_INDEX_NAME);
  console.log('Topic Name', TOPIC_NAME);
  
  // IF this lambda throws an error, would it go to a DLQ?
  
  // This is the type AWS themselves use
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastEvaluatedKey: Record<string, any> | undefined = undefined;
  let totalItems = 0;
  do {
    const queryCmdInput: QueryCommandInput = {
      TableName: TABLE_NAME,
      IndexName: TABLE_INDEX_NAME,
      KeyConditionExpression: 'UserStatus = :status',
      ExpressionAttributeValues: {
        ':status': { S: 'live' }
      },
      ExclusiveStartKey: lastEvaluatedKey
    };
    console.log('Query command:', JSON.stringify(queryCmdInput, null, 2));

    const queryCmd = new QueryCommand(queryCmdInput);
    // Using await here as each query depends on the result of the previous one
    // eslint-disable-next-line no-await-in-loop
    const result = await dynamoDbClient.send(queryCmd);

    if (result.Items) {
      totalItems += result.Items.length;
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`${totalItems} users processed`);
}

export const handler = lambdaHandler;
