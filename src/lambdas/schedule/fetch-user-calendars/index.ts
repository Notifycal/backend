import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import type { senderStandardSchema } from '@model/app-events/common';
import type {
  UserCalendarFetchedEvent,
  userCalendarFetchedEventSchema
} from '@model/app-events/UserCalendarFetchedEvent';
import { eventBridgeEventSchema } from '@model/lambda-events/EventBridgeEvents';
import type { LiveUserStoreRecord } from '@model/store/LiveUserStoreRecord';
import type { UserIdpAuthorizationStoreRecord } from '@model/store/UserIdpAuthorizationStoreRecord';
import { phoneByCountry } from '@notifycal/shared/i18n';
import type { senderSchema } from '@notifycal/shared/schemas';
import type { CorrelationId, DateTime, EventId } from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { SnsService } from '@services/sns';
import { UserLiveIndexStore } from '@services/stores/user-live-index-store';
import type { Context } from 'aws-lambda';
import { DateTime as DT } from 'luxon';
import { match, P } from 'ts-pattern';
import { v4 } from 'uuid';
import type { z } from 'zod';
import { readFetchUserCalendarsConfig, type FetchUserCalendarsConfig } from './config';

const eventSchema = eventBridgeEventSchema<FetchUserCalendarsConfig>();
export type Event = z.infer<typeof eventSchema>;

function toCanonicalForm(
  senderContact: z.infer<typeof senderSchema>
): z.infer<typeof senderStandardSchema> {
  return match(senderContact)
    .with({ type: 'rcs', identifier: P.string }, (rcsPhone) => rcsPhone)
    .with({ type: 'phone', countryCode: P.any, phoneNumber: P.string }, (phone) => ({
      type: phone.type,
      phoneNumber:
        `${phoneByCountry[phone.countryCode].phoneDetails.dialCode}${phone.phoneNumber.toString()}` as PhoneNumberE164
    }))
    .exhaustive();
}

function toEvents(
  item: LiveUserStoreRecord<'google.com'> & UserIdpAuthorizationStoreRecord<'google.com'>,
  run: z.infer<typeof userCalendarFetchedEventSchema.shape.data.shape.run>
): Array<UserCalendarFetchedEvent> {
  const pageData = item.Config.calendars.map((c) => ({
    calendar: c,
    run: run,
    senderDetails: toCanonicalForm(item.Config.business.senderContact),
    template: {
      id: c.template.id,
      fields: {
        business: item.Config.business
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function lambdaHandler(event: Event, context: Context): Promise<void> {
  const { userLiveIndexStoreConfig, userCalendarFetchedTopicConfig } = event.lambdaConfig;

  const userLiveProvider = UserLiveIndexStore.withConfig(userLiveIndexStoreConfig);
  const snsService = SnsService.withConfig(userCalendarFetchedTopicConfig);

  const windowStart = DT.fromISO(event.time).toUTC().plus({ hours: 24 });
  const run = {
    lowerBoundStartTime: windowStart.toISO() as DateTime,
    upperBoundStartTime: windowStart
      .plus({ minutes: event.lambdaConfig.cronRunConfig.windowInMinutes })
      .minus({ millisecond: 1 })
      .toISO() as DateTime,
    slidingWindowInMinutes: event.lambdaConfig.cronRunConfig.windowInMinutes
  };
  logger.info(
    `Starting run corresponding to cron ${event.time}. Time window: [${run.lowerBoundStartTime}, ${run.upperBoundStartTime}]`
  );
  let totalPages = 0;
  let totalItems = 0;
  try {
    for await (const liveUsersPage of userLiveProvider.getLiveUsers()) {
      logger.info(
        `Processing page of results number ${totalPages + 1}. Live users in page: ${liveUsersPage.length}`
      );

      await Promise.allSettled(
        liveUsersPage
          .flatMap((user) => toEvents(user, run))
          .map((event) =>
            snsService.publish(event).catch((error) => {
              const msg = `Error publishing an event to SNS`;
              logger.error(msg, { error, eventId: event.eventId });
              logger.info(`Moving on after error...`);
              return;
            })
          )
      );
      totalPages += 1;
      totalItems += liveUsersPage.length;
    }
  } catch (error) {
    await Promise.reject(
      new Error(`An error happened while processing live users`, { cause: error })
    );
  } finally {
    logger.info(
      `Total number of procesesed pages ${totalPages}. Total number of processed live users: ${totalItems}`
    );
  }
}
export const handler = backgroundProcessingMiddleware(
  () => readFetchUserCalendarsConfig(),
  eventSchema
).handler<Event>(lambdaHandler);
