import type { Logger } from '@aws-lambda-powertools/logger';
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { metrics } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import { noActionableEventsFound } from '@model/app-events/NoActionableEventsFoundEvent';
import { noPhoneNumberForCalendarEventFound } from '@model/app-events/NoPhoneNumberForCalendarEventFoundEvent';
import { userFetchedEventsParsingFailed } from '@model/app-events/UserFetchedEventsParsingFailedEvent';
import type { IdpConfigs } from '@model/Config';
import type { ParsingError } from '@model/Errors';
import type { ServiceResponse } from '@model/ServiceResponse';
import type {
  CalendarEvent,
  CountryCode,
  DateTime,
  EventId,
  SenderContact
} from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { eventsStartTimeWithin } from '@services/calendar-events';
import type { MetricDimensions } from '@services/observability/metrics';
import { phoneExtractor } from '@services/phone-extractor';
import { SnsService } from '@services/sns';
import { interpolate } from '@services/template';
import { allSettledAllOrErrorHandler } from '@utils/promises';
import { DateTime as DT } from 'luxon';
import { match } from 'ts-pattern';
import { v4 } from 'uuid';
import type { ActionableEventsConfig } from './config';
import type { Record } from './schema';

interface CalendarEventWithAnAttendeePhoneNumber {
  calendarEvent: CalendarEvent;
  attendeePhoneNumber: PhoneNumberE164;
}

function fetchCalendarEvents(
  event: Record['body'],
  idpConfigs: IdpConfigs,
  logger: Logger
): Promise<ServiceResponse<CalendarEvent, ParsingError>> {
  const { idpAuthorization } = event.sensitiveData;
  const calendarEventStartTime = DT.fromISO(event.data.run.lowerBoundStartTime).toUTC();
  const includeAllDayEvents =
    calendarEventStartTime.get('hour') === 10 && calendarEventStartTime.get('minute') === 0;

  return eventsStartTimeWithin(
    event.data.calendar.id,
    event.data.run.lowerBoundStartTime,
    event.data.run.upperBoundStartTime,
    includeAllDayEvents,
    idpAuthorization,
    event.idp,
    idpConfigs,
    logger
  );
}

function extractCountryCode(senderDetails: SenderContact): CountryCode {
  return match(senderDetails)
    .with({ type: 'sms' }, () => 'ES' as CountryCode)
    .with({ type: 'rcs' }, () => 'ES' as CountryCode)
    .exhaustive();
}

function fetchAttendeePhoneNumbersForCalendarEvent(
  calendarEvent: CalendarEvent,
  event: Record['body'],
  idpConfigs: IdpConfigs,
  snsService: SnsService,
  logger: Logger
): Promise<Array<CalendarEventWithAnAttendeePhoneNumber>> {
  return phoneExtractor(
    calendarEvent,
    extractCountryCode(event.data.senderDetails), // Hint: this is used to help with the reading of the receiver's phone out of the calendar event info
    event.idp,
    event.sensitiveData.idpAuthorization,
    idpConfigs,
    logger
  ).then((phoneNumbers) => {
    const dimensions: MetricDimensions = {
      idp: event.idp,
      vendor: event.idp
    };
    metrics.addMetric(
      'AttendeePhoneNumbersInCalendarEventCount',
      MetricUnit.Count,
      phoneNumbers.size,
      dimensions
    );
    if (phoneNumbers && phoneNumbers.size > 0) {
      const attendeePhoneData: Array<CalendarEventWithAnAttendeePhoneNumber> = Array.from([
        ...phoneNumbers
      ]).map((phoneNumber) => ({
        calendarEvent: calendarEvent,
        attendeePhoneNumber: phoneNumber
      }));
      return Promise.resolve(attendeePhoneData);
    } else {
      return snsService
        .safePublish(noPhoneNumberForCalendarEventFound(event, calendarEvent))
        .then(() => []);
    }
  });
}

function buildActionableEvents(
  attendeePhoneData: Array<CalendarEventWithAnAttendeePhoneNumber>,
  event: Record['body']
): Array<ActionableEventFoundEvent> {
  return attendeePhoneData.map(({ calendarEvent, attendeePhoneNumber }) => {
    const actionableEvent: ActionableEventFoundEvent = {
      eventId: v4() as EventId,
      correlationId: event.correlationId,
      eventType: 'ActionableEventFound',
      happenedAt: new Date().toISOString() as DateTime,
      userId: event.userId,
      idp: event.idp,
      idpId: event.idpId,
      data: {
        run: event.data.run,
        calendar: event.data.calendar,
        calendarEvent,
        receiverDetails: {
          type: 'phone',
          phoneNumber: attendeePhoneNumber,
          countryCode: extractCountryCode(event.data.senderDetails)
        },
        senderDetails: event.data.senderDetails,
        message: interpolate(
          event.data.template.id,
          event.data.template.fields.business.name,
          event.data.template.fields.business.address,
          calendarEvent.startTime,
          calendarEvent.timeZone
        )
      }
    };
    return actionableEvent;
  });
}

function handleFetchedCalendarEvents(
  successList: Array<CalendarEvent>,
  failureList: Array<ParsingError>,
  event: Record['body'],
  snsService: SnsService,
  logger: Logger
): Promise<Array<CalendarEvent>> {
  if ((successList && successList?.length > 0) || (failureList && failureList?.length > 0)) {
    return Promise.allSettled(
      failureList.map((failure) =>
        snsService.publish(userFetchedEventsParsingFailed(event, failure))
      )
    )
      .then((results) =>
        allSettledAllOrErrorHandler(results, 'publish calendar event fetch failures', logger)
      )
      .then(() => successList);
  } else {
    return snsService.safePublish(noActionableEventsFound(event)).then(() => []);
  }
}

function handleCalendarEventAttendees(
  calendarEvents: Array<CalendarEvent>,
  event: Record['body'],
  idpConfigs: IdpConfigs,
  snsService: SnsService,
  logger: Logger
): Promise<Array<CalendarEventWithAnAttendeePhoneNumber>> {
  return Promise.allSettled(
    calendarEvents.map((calendarEvent) => {
      const dimensions: MetricDimensions = {
        idp: event.idp,
        vendor: event.idp
      };
      metrics.addMetric(
        'AttendeeInCalendarEventCount',
        MetricUnit.Count,
        calendarEvent.attendees.length,
        dimensions
      );
      return fetchAttendeePhoneNumbersForCalendarEvent(
        calendarEvent,
        event,
        idpConfigs,
        snsService,
        logger
      );
    })
  ).then((results) => {
    return allSettledAllOrErrorHandler(
      results,
      'fetch all atteendee phone number for every calendar event',
      logger
    ).flat();
  });
}

function buildAndPublishActionableEvents(
  eventWithAttendeePhoneNumbers: Array<CalendarEventWithAnAttendeePhoneNumber>,
  event: Record['body'],
  snsService: SnsService,
  logger: Logger
): Promise<void> {
  const actionableEvents = buildActionableEvents(eventWithAttendeePhoneNumbers, event);
  return Promise.allSettled(
    actionableEvents.map((actionableEvent) => snsService.publish(actionableEvent))
  )
    .then((results) => allSettledAllOrErrorHandler(results, 'publish actionable events', logger))
    .then(() => {
      return;
    });
}

export function recordProcessor(
  record: Record,
  config: ActionableEventsConfig,
  logger: Logger
): Promise<void> {
  const snsService = SnsService.withConfig(config.actionableEventFoundTopicConfig, logger);
  const event = record.body;
  return fetchCalendarEvents(event, config.idpConfigs, logger)
    .then(({ successList, failureList }) =>
      handleFetchedCalendarEvents(successList, failureList, event, snsService, logger)
    )
    .then((calendarEvents) =>
      handleCalendarEventAttendees(calendarEvents, event, config.idpConfigs, snsService, logger)
    )
    .then((eventWithAttendeePhoneNumbers) => {
      return buildAndPublishActionableEvents(
        eventWithAttendeePhoneNumbers,
        event,
        snsService,
        logger
      );
    });
}
