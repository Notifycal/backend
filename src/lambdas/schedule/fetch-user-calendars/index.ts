import { UserLiveIndexStore } from '@services/stores/user-live-index-store';
import { configMiddleware } from '@common/lambda-middleware';
import { type FetchUserCalendarsConfig, readFetchUserCalendarsConfig } from './config';
import type { z } from 'zod';
import { eventBridgeEventSchema } from '@model/lambda-events/EventBridgeEvents';
import { publishToSNSCalendarMessage, transformItem } from './send-message';

const eventSchema = eventBridgeEventSchema<FetchUserCalendarsConfig>();
export type Event = z.infer<typeof eventSchema>;

async function lambdaHandler(event: Event): Promise<void> {
  const { userLiveIndexStoreConfig } = event.lambdaConfig;

  const userLiveProvider = UserLiveIndexStore.withConfig(userLiveIndexStoreConfig);
  const liveUsersPaginator = userLiveProvider.getLiveUsers();

  let totalItems = 0;
  for await (const liveUsersPage of liveUsersPaginator) {
    console.log('Processing new page of results');
    console.log('First item of the page:', JSON.stringify(liveUsersPage[0], null, 2));
    totalItems += liveUsersPage.length;

    const sendCalendarFoundMessagePromises = liveUsersPage
      .map(transformItem)
      .map(publishToSNSCalendarMessage);

    await Promise.allSettled(sendCalendarFoundMessagePromises);
  }

  // IF this lambda throws an error, would it go to a DLQ?
  console.log(`${totalItems} users processed`);
}

// export const handler = lambdaHandler;
export const handler = configMiddleware(() => readFetchUserCalendarsConfig()).handler<Event>(
  lambdaHandler
);
