import { configMiddleware } from '@common/lambda-middleware';
import { eventBridgeEventSchema } from '@model/lambda-events/EventBridgeEvents';
import { extractErrorMessage } from '@services/common/error-handling';
import { UserLiveIndexStore } from '@services/stores/user-live-index-store';
import { v4 } from 'uuid';
import type { z } from 'zod';
import { readFetchUserCalendarsConfig, type FetchUserCalendarsConfig } from './config';
import { publishToSNSCalendarMessage } from './send-message';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const eventSchema = eventBridgeEventSchema<FetchUserCalendarsConfig>();
export type Event = z.infer<typeof eventSchema>;

async function lambdaHandler(event: Event): Promise<void> {
  const { userLiveIndexStoreConfig, userCalendarFetchedTopicConfig } = event.lambdaConfig;

  const userLiveProvider = UserLiveIndexStore.withConfig(userLiveIndexStoreConfig);
  const liveUsersPaginator = userLiveProvider.getLiveUsers();

  let totalItems = 0;
  try {
    for await (const liveUsersPage of liveUsersPaginator) {
      console.log('Processing new page of results');
      await Promise.allSettled(
        liveUsersPage.map(async (user) => {
          const event = {
            id: v4(),
            ...user
          };
          return publishToSNSCalendarMessage(event, userCalendarFetchedTopicConfig.topicArn);
        })
      );
      totalItems += liveUsersPage.length;
    }
  } catch (error) {
    return Promise.reject(
      new Error(
        `An error happened while processing live users. Error: ${extractErrorMessage(error)}`
      )
    );
  }

  // IF this lambda throws an error, would it go to a DLQ?
  console.log(`${totalItems} users processed`);
}
export const handler = configMiddleware(() => readFetchUserCalendarsConfig(), false).handler<Event>(
  lambdaHandler
);
