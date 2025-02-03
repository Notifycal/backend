import type { EventBridgeEvent } from 'aws-lambda';

import { readEnv } from '@services/common/config';

import { snsClient } from '@clients/sns';
import { PublishCommand, type PublishCommandOutput } from '@aws-sdk/client-sns';
import { UserLiveIndexStore } from '@services/stores/user-live-index-store';



const sns = snsClient();

const transformItems = <T>(items: T): T => {
  // This function does user x calendar list and transforms the items into SNS messages
  return items;
};

const sendSNSCalendarMessage = (
  topic: string,
  messageBody: string
): Promise<PublishCommandOutput> => {
  const publishCommand = new PublishCommand({
    TopicArn: topic,
    Message: messageBody
  });
  return sns.send(publishCommand);
};

async function lambdaHandler(event: EventBridgeEvent<'Scheduled event', string>): Promise<void> {
  console.log('Lambda event: ');
  console.log(JSON.stringify(event, null, 2));
  
  const env = readEnv();
  const TABLE_NAME = env.get('USERS_TABLE_NAME').required().asString();
  const TABLE_INDEX_NAME = env.get('LOCAL_USERS_INDEX_NAME').required().asString();
  const TOPIC_ARN = env.get('FETCH_CALENDARS_TOPIC_ARN').required().asString();
  
  console.log('Table Name', TABLE_NAME);
  console.log('Index Name', TABLE_INDEX_NAME);
  console.log('Topic Name', TOPIC_ARN);

  const config = {
    tableName: TABLE_NAME,
    indexName: TABLE_INDEX_NAME,
    pageSize: 50,
  };
  
  const userLiveProvider = UserLiveIndexStore.withConfig(config)

  const liveUsersPaginator = userLiveProvider.getLiveUsers();
  
  let totalItems = 0;
  for await (const liveUsersPage of liveUsersPaginator) {
    console.log('Processing new page of results');
    totalItems += liveUsersPage.length;
  }

  // IF this lambda throws an error, would it go to a DLQ?
  console.log(`${totalItems} users processed`);
}

export const handler = lambdaHandler;
