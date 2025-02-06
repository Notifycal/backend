import { configMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import type { UserCalendarFetchedEvent } from '@model/app-events/UserCalendarFetchedEvent';
import { eventBridgeEventSchema } from '@model/lambda-events/EventBridgeEvents';
import type { LiveUserStoreRecord } from '@model/store/LiveUserStoreRecord';
import type { UserIdpAuthorizationStoreRecord } from '@model/store/UserIdpAuthorizationStoreRecord';
import type { CorrelationId, DateTime, EventId, TemplateId } from '@notifycal/shared/types';
import { extractErrorMessage } from '@services/common/error-handling';
import { SnsService } from '@services/sns';
import { UserLiveIndexStore } from '@services/stores/user-live-index-store';
import { v4 } from 'uuid';
import type { z } from 'zod';
import { readFetchUserCalendarsConfig, type FetchUserCalendarsConfig } from './config';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const eventSchema = eventBridgeEventSchema<FetchUserCalendarsConfig>();
export type Event = z.infer<typeof eventSchema>;

function toEvents(
  item: LiveUserStoreRecord<'google.com'> & UserIdpAuthorizationStoreRecord<'google.com'>
): Array<UserCalendarFetchedEvent> {
  const pageData = item.Config.calendars.map((c) => ({
    calendar: c,
    template: {
      id: 'some-template-id' as TemplateId,
      fields: {
        business: {
          name: item.Config.businessName,
          address: item.Config.businessAddress
        }
      }
    }
  }));
  return pageData.map((data) => {
    const eventId = v4();
    const event: UserCalendarFetchedEvent = {
      eventId: eventId as EventId,
      happenedAt: new Date().toISOString() as DateTime,
      idp: item.Idp,
      idpId: item.IdpId,
      userId: item.UserId,
      eventType: 'UserCalendarFetched',
      correlationId: eventId as CorrelationId, // Same as EventId cause it is the first event in the chain
      data: data,
      sensitiveData: {
        idpAuthorization: item.IdpAuthorization
      }
    };
    return event;
  });
}

async function lambdaHandler(event: Event): Promise<void> {
  const { userLiveIndexStoreConfig, userCalendarFetchedTopicConfig } = event.lambdaConfig;

  const userLiveProvider = UserLiveIndexStore.withConfig(userLiveIndexStoreConfig);
  const snsService = SnsService.withConfig(userCalendarFetchedTopicConfig);

  let totalPages = 0;
  let totalItems = 0;
  try {
    for await (const liveUsersPage of userLiveProvider.getLiveUsers()) {
      logger.info(
        `Processing page of results number ${totalItems + 1}. Live users in page: ${liveUsersPage.length}`
      );
      await Promise.allSettled(
        liveUsersPage.map((user) => toEvents(user).map((event) => snsService.publishEvent(event)))
      );
      totalPages += 1;
      totalItems += liveUsersPage.length;
    }
  } catch (error) {
    await Promise.reject(
      new Error(
        `An error happened while processing live users. Error: ${extractErrorMessage(error)}`
      )
    );
  } finally {
    logger.info(
      `Total number of procesesed pages ${totalPages}. Total number of processed live users: ${totalItems}`
    );
  }
}
export const handler = configMiddleware(() => readFetchUserCalendarsConfig(), false).handler<Event>(
  lambdaHandler
);
