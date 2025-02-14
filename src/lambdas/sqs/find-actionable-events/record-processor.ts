import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFound';
import { noPhoneNumberForAttendeeFound } from '@model/app-events/NoPhoneNumberForAttendeeFound';
import { userFetchedEventsParsingFailed } from '@model/app-events/UserFetchedEventsParsingFailed';
import type { ParsingError } from '@model/Errors';
import type { ServiceResponse } from '@model/ServiceResponse';
import type {
  BusinessAddress,
  BusinessName,
  CalendarEvent,
  DateTime,
  Email,
  EventId,
  PhoneNumber,
  TimeZone
} from '@notifycal/shared/types';
import { eventsStartTimeWithin } from '@services/calendar-events';
import { phoneNumberByEmail } from '@services/contacts';
import { DeadLetteringService } from '@services/dead-lettering';
import { SnsService } from '@services/sns';
import { allSettledAllOrErrorHandler } from '@utils/promises';
import { DateTime as DT } from 'luxon';
import { v4 } from 'uuid';
import type { Record } from '.';
import type { ActionableEventsConfig } from './config';

function interpolateMessage(
  businessName: BusinessName,
  businessAddress: BusinessAddress,
  startTime: DateTime,
  timeZone: TimeZone
): string {
  const dateTime = DT.fromISO(startTime, { zone: timeZone });
  return `Tienes una cita con ${businessName} en ${businessAddress} el dia ${dateTime.get('day')}/${dateTime.get('month')} a las ${dateTime.get('hour')}:${dateTime.get('minute')}. En caso de no poder asistir, pongase en contacto con nosotros. Este mensaje ha sido enviado con Notifycal.es`;
}

function fetchCalendarEvents(
  event: Record['body']
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
    event.idp
  );
}

function fetchAttendeePhoneNumbers(
  calendarEvent: CalendarEvent,
  event: Record['body'],
  dqlService: DeadLetteringService
): Promise<Array<{ calendarEvent: CalendarEvent; attendeePhoneNumber: PhoneNumber }>> {
  return Promise.allSettled(
    calendarEvent.attendees.map((attendee) =>
      phoneNumberByEmail(
        attendee.id as Email,
        event.sensitiveData.idpAuthorization,
        event.idp
      ).then((phoneNumbers) => {
        if (phoneNumbers && phoneNumbers.length > 0) {
          return Promise.resolve([
            {
              calendarEvent: calendarEvent,
              attendeePhoneNumber: phoneNumbers[0] // if attendee has more than 1 phone number set, pick the first one.
            }
          ]);
        } else {
          return dqlService
            .send(noPhoneNumberForAttendeeFound(event, calendarEvent, attendee.id))
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
  attendeePhoneData: Array<{ calendarEvent: CalendarEvent; attendeePhoneNumber: PhoneNumber }>,
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
        event: calendarEvent,
        contactDetails: {
          type: 'phone',
          number: attendeePhoneNumber
        },
        message: interpolateMessage(
          event.data.template.fields.business.name,
          event.data.template.fields.business.address,
          calendarEvent.startTime,
          calendarEvent.timeZone
        )
      },
      sensitiveData: {
        idpAuthorization: {
          refreshToken: 'some refresh token'
        }
      }
    };
    return actionableEvent;
  });
}

export function recordProcessor(record: Record, config: ActionableEventsConfig): Promise<void> {
  const snsService = SnsService.withConfig(config.actionableEventFoundTopicConfig);
  const dlqService = DeadLetteringService.withConfig(config.deadLetterQueueConfig);
  const event = record.body;

  return fetchCalendarEvents(event)
    .then(({ successList, failureList }) => {
      if ((successList && successList?.length > 0) || (failureList && failureList?.length > 0)) {
        return Promise.allSettled(
          failureList.map((failure) =>
            dlqService.send(userFetchedEventsParsingFailed(event, failure))
          )
        )
          .then((results) =>
            allSettledAllOrErrorHandler(results, 'send calendar event fetch failures to DLQ')
          )
          .then(() => successList);
      } else {
        logger.info(`NoActionableEventsFound`);
        return Promise.resolve([]);
      }
    })
    .then((calendarEvents) =>
      Promise.allSettled(
        calendarEvents.map((calendarEvent) =>
          fetchAttendeePhoneNumbers(calendarEvent, event, dlqService)
        )
      )
    )
    .then((results) =>
      allSettledAllOrErrorHandler(results, 'fetch all atteendee phone number for every calendar')
    )
    .then((eventWithAttendeePhoneNumbers) => {
      const actionableEvents = buildActionableEvents(eventWithAttendeePhoneNumbers.flat(), event);
      return Promise.allSettled(
        actionableEvents.map((actionableEvent) => snsService.publishEvent(actionableEvent))
      );
    })
    .then((results) => allSettledAllOrErrorHandler(results, 'publish actionable events'))
    .then(() => {
      return;
    });
}
