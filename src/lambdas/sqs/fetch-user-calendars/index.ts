import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { noUserCalendarFound } from '@model/app-events/NoUserCalendarFoundEvent';
import { scheduledFetchUserCalendarEventFired } from '@model/app-events/ScheduledFetchUserCalendarEventFiredEvent';
import type {
  UserCalendarFetchedEvent,
  userCalendarFetchedEventSchema
} from '@model/app-events/UserCalendarFetchedEvent';
import type { CronRunConfig } from '@model/Config';
import { eventBridgeEventSchema as _eventBridgeEventSchema } from '@model/lambda-events/EventBridgeEvents';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import { fromStoreRecord as fromContactStoreRecord } from '@model/store/ContactDetailsRecordStore';
import type { LiveUserStoreRecord } from '@model/store/LiveUserStoreRecord';
import { fromStoreRecord } from '@model/store/ReminderConfigStoreRecord';
import type { UserIdpAuthorizationStoreRecord } from '@model/store/UserIdpAuthorizationStoreRecord';
import type { CorrelationId, DateTime, EventId } from '@notifycal/shared/types';
import { setupLoggerCorrelationIdEventBridge } from '@services/common/logger';
import { SnsService } from '@services/sns';
import { UserLiveIndexStore } from '@services/stores/user-live-index-store';
import { toCanonicalForm } from '@utils/phone';
import type { Context } from 'aws-lambda';
import { DateTime as DT } from 'luxon';
import { match, P } from 'ts-pattern';
import { v4 } from 'uuid';
import type { z } from 'zod';
import { readFetchUserCalendarsConfig, type FetchUserCalendarsConfig } from './config';

const eventBridgeEventSchema = _eventBridgeEventSchema();
const eventSchema = eventSqsSchema<FetchUserCalendarsConfig, typeof eventBridgeEventSchema>(
  eventBridgeEventSchema
);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;
export interface CronRunForEvent {
  lowerBoundStartTime: DateTime;
  upperBoundStartTime: DateTime;
  slidingWindowInMinutes: number;
}

function toEvents(
  item: LiveUserStoreRecord<'google.com'> & UserIdpAuthorizationStoreRecord<'google.com'>,
  run: z.infer<typeof userCalendarFetchedEventSchema.shape.data.shape.run>
): Array<UserCalendarFetchedEvent> {
  const senderCountryCode = match(item.Config.Business.SenderContact)
    .with({ Type: 'phone', CountryCode: P.any }, (phone) => phone.CountryCode)
    .with({ Type: 'rcs', Identifier: P.string }, () => undefined)
    .exhaustive();
  const pageData = fromStoreRecord(item.Config).calendars.map((c) => ({
    calendar: c,
    run: run,
    senderDetails: toCanonicalForm(fromContactStoreRecord(item.Config.Business.SenderContact)),
    senderCountryCode: senderCountryCode,
    template: {
      id: c.template.id,
      fields: {
        business: {
          name: item.Config.Business.Name,
          address: item.Config.Business.Address
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

function runDataFromConfig(config: CronRunConfig, event: Record['body']): CronRunForEvent {
  const windowStart = DT.fromISO(event.time).toUTC().plus({ hours: 24 });
  return {
    lowerBoundStartTime: windowStart.toISO() as DateTime,
    upperBoundStartTime: windowStart
      .plus({ minutes: config.windowInMinutes })
      .minus({ millisecond: 1 })
      .toISO() as DateTime,
    slidingWindowInMinutes: config.windowInMinutes
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function lambdaHandler(event: Event, context: Context): Promise<void> {
  const { userLiveIndexStoreConfig, userCalendarFetchedTopicConfig, cronRunConfig } =
    event.lambdaConfig;
  const record = event.Records[0].body;
  const userLiveProvider = UserLiveIndexStore.withConfig(userLiveIndexStoreConfig);
  const snsService = SnsService.withConfig(userCalendarFetchedTopicConfig);

  const systemEvent = scheduledFetchUserCalendarEventFired(record, cronRunConfig);
  await snsService.safePublish(systemEvent);

  const run = runDataFromConfig(cronRunConfig, record);
  logger.appendKeys({ run });
  logger.info(
    `Starting run corresponding to cron ${record.time}. Time window: [${run.lowerBoundStartTime}, ${run.upperBoundStartTime}]`
  );
  let totalPages = 0;
  let totalItems = 0;
  try {
    for await (const liveUsersPage of userLiveProvider.getLiveUsers()) {
      logger.info(
        `Processing page of results number ${totalPages + 1}. Live users in page: ${liveUsersPage.length}`
      );

      const events = await Promise.all(
        liveUsersPage.map((user) => {
          logger.appendKeys({
            userId: user.UserId,
            idpId: user.IdpId,
            idp: user.Idp
          });
          if (user.Config.Calendars && user.Config.Calendars.length > 0) {
            return Promise.resolve(toEvents(user, run));
          } else {
            const errorEvent = noUserCalendarFound(record, run, user);
            return snsService.safePublish(errorEvent).then(() => []);
          }
        })
      ).then((events) => events.flat());

      await Promise.allSettled(events.map((event) => snsService.safePublish(event)));
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
const handler = backgroundProcessingMiddleware(
  () => readFetchUserCalendarsConfig(),
  eventSchema,
  setupLoggerCorrelationIdEventBridge
).handler<Event>(lambdaHandler);

module.exports = { handler };
