import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import { noActionableEventsFound } from '@model/app-events/NoActionableEventsFoundEvent';
import { noAttendeesInCalendarEventFound } from '@model/app-events/NoAttendeesInCalendarEventFoundEvent';
import { noPhoneNumberForAttendeeFound } from '@model/app-events/NoPhoneNumberForAttendeeFoundEvent';
import { userFetchedEventsParsingFailed } from '@model/app-events/UserFetchedEventsParsingFailedEvent';
import type { IdpConfigs } from '@model/Config';
import type { ParsingError } from '@model/Errors';
import type { ServiceResponse } from '@model/ServiceResponse';
import type { CalendarEvent, DateTime, Email, EventId } from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { eventsStartTimeWithin } from '@services/calendar-events';
import { phoneNumberByEmail } from '@services/contacts';
import { SnsService } from '@services/sns';
import { interpolate } from '@services/template';
import { allSettledAllOrErrorHandler } from '@utils/promises';
import { DateTime as DT } from 'luxon';
import { v4 } from 'uuid';
import type { ActionableEventsConfig } from './config';
import type { Record } from './schema';

interface CalendarEventWithAnAttendeePhoneNumber {
  calendarEvent: CalendarEvent;
  attendeePhoneNumber: PhoneNumberE164;
}

function fetchCalendarEvents(
  event: Record['body'],
  idpConfigs: IdpConfigs
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
    idpConfigs
  );
}

function fetchAttendeePhoneNumbers(
  calendarEvent: CalendarEvent,
  event: Record['body'],
  idpConfigs: IdpConfigs,
  snsService: SnsService
): Promise<Array<CalendarEventWithAnAttendeePhoneNumber>> {
  return Promise.allSettled(
    calendarEvent.attendees.map((attendee) =>
      phoneNumberByEmail(
        attendee.id as Email,
        event.sensitiveData.idpAuthorization,
        event.idp,
        idpConfigs
      ).then((phoneNumbers) => {
        if (phoneNumbers && phoneNumbers.length > 0) {
          return Promise.resolve([
            {
              calendarEvent: calendarEvent,
              attendeePhoneNumber: phoneNumbers[0] // if attendee has more than 1 phone number set, pick the first one.
            }
          ]);
        } else {
          return snsService
            .safePublish(noPhoneNumberForAttendeeFound(event, calendarEvent, attendee.id))
            .then(() => []);
        }
      })
    )
  ).then((results) =>
    allSettledAllOrErrorHandler(
      results,
      `fetch attendees' phone numbers for a calendar event ${calendarEvent.id}`
    ).flat()
  );
}

function buildActionableEvents(
  attendeePhoneData: Array<CalendarEventWithAnAttendeePhoneNumber>,
  event: Record['body']
): Array<ActionableEventFoundEvent> {
  return attendeePhoneData.map(({ calendarEvent: calendarEvent, attendeePhoneNumber }) => {
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
          phoneNumber: attendeePhoneNumber
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
  snsService: SnsService
): Promise<Array<CalendarEvent>> {
  if ((successList && successList?.length > 0) || (failureList && failureList?.length > 0)) {
    return Promise.allSettled(
      failureList.map((failure) =>
        snsService.publish(userFetchedEventsParsingFailed(event, failure))
      )
    )
      .then((results) =>
        allSettledAllOrErrorHandler(results, 'publish calendar event fetch failures')
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
  snsService: SnsService
): Promise<Array<CalendarEventWithAnAttendeePhoneNumber>> {
  return Promise.allSettled(
    calendarEvents.map((calendarEvent) => {
      if (calendarEvent.attendees.length > 0) {
        return fetchAttendeePhoneNumbers(calendarEvent, event, idpConfigs, snsService);
      } else {
        return snsService
          .safePublish(noAttendeesInCalendarEventFound(event, calendarEvent))
          .then(() => []);
      }
    })
  ).then((results) => {
    return allSettledAllOrErrorHandler(
      results,
      'fetch all atteendee phone number for every calendar event'
    ).flat();
  });
}

function buildAndPublishActionableEvents(
  eventWithAttendeePhoneNumbers: Array<CalendarEventWithAnAttendeePhoneNumber>,
  event: Record['body'],
  snsService: SnsService
): Promise<void> {
  const actionableEvents = buildActionableEvents(eventWithAttendeePhoneNumbers, event);
  return Promise.allSettled(
    actionableEvents.map((actionableEvent) => snsService.publish(actionableEvent))
  )
    .then((results) => allSettledAllOrErrorHandler(results, 'publish actionable events'))
    .then(() => {
      return;
    });
}

export function recordProcessor(record: Record, config: ActionableEventsConfig): Promise<void> {
  const snsService = SnsService.withConfig(config.actionableEventFoundTopicConfig);
  const event = record.body;
  return fetchCalendarEvents(event, config.idpConfigs)
    .then(({ successList, failureList }) =>
      handleFetchedCalendarEvents(successList, failureList, event, snsService)
    )
    .then((calendarEvents) =>
      handleCalendarEventAttendees(calendarEvents, event, config.idpConfigs, snsService)
    )
    .then((eventWithAttendeePhoneNumbers) => {
      return buildAndPublishActionableEvents(eventWithAttendeePhoneNumbers, event, snsService);
    });
}
