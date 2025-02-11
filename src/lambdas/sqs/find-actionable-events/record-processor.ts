import { logger } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFound';
import type { ServiceResponse } from '@model/ServiceResponse';
import type {
  BusinessAddress,
  BusinessName,
  CalendarEvent,
  DateTime,
  Email,
  EventId,
  PhoneNumber
} from '@notifycal/shared/types';
import { eventsStartTimeWithin } from '@services/calendar-events';
import { phoneNumberByEmail } from '@services/contacts';
import { SnsService } from '@services/sns';
import dayjs from 'dayjs';
import { v4 } from 'uuid';
import type { Record } from '.';
import type { ActionableEventsConfig } from './config';
import { publishToDlq } from './dlq';

function interpolateMessage(
  businessName: BusinessName,
  businessAddress: BusinessAddress,
  startTime: DateTime
): string {
  const dateTime = dayjs(startTime);
  return `Tienes una cita con ${businessName} en ${businessAddress} el dia ${dateTime.get('day')}/${dateTime.get('month')} a las ${dateTime.get('hours')}:${dateTime.get('minutes')}. En caso de no poder asistir, pongase en contacto con nosotros. Este mensaje ha sido enviado con Notifycal.es`;
}

function fetchCalendarEvents(
  event: Record['body'],
  config: ActionableEventsConfig
): Promise<ServiceResponse<CalendarEvent>> {
  const { idpAuthorization } = event.sensitiveData;
  const calendarEventStartTime = dayjs(event.data.run.lowerBoundStartTime);
  const includeAllDayEvents =
    calendarEventStartTime.hour() === 10 && calendarEventStartTime.minute() === 0;

  return eventsStartTimeWithin(
    event.data.calendar.id,
    event.data.run.lowerBoundStartTime,
    event.data.run.upperBoundStartTime,
    includeAllDayEvents,
    idpAuthorization,
    event.idp,
    config.idpConfigs
  );
}

function fetchAttendeePhoneNumbers(
  calendarEvent: CalendarEvent,
  event: Record['body'],
  config: ActionableEventsConfig
): Promise<Array<{ calendarEvent: CalendarEvent; attendeePhoneNumber: PhoneNumber }>> {
  return Promise.all(
    calendarEvent.attendees.map((attendee) =>
      phoneNumberByEmail(
        attendee.id as Email,
        event.sensitiveData.idpAuthorization,
        event.idp,
        config.idpConfigs
      ).then((phoneNumbers) => {
        if (phoneNumbers && phoneNumbers.length > 0) {
          return Promise.resolve([
            {
              calendarEvent: calendarEvent,
              attendeePhoneNumber: phoneNumbers[0]
            }
          ]);
        } else {
          return publishToDlq(new Error(`No phone number on some calendar event attendee`)).then(
            () => [],
            () => []
          );
        }
      })
    )
  ).then((results) => results.flat());
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
          calendarEvent.startTime
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
  const event = record.body;

  return fetchCalendarEvents(event, config)
    .then(({ successList, failureList }) => {
      if ((successList && successList?.length > 0) || (failureList && failureList?.length > 0)) {
        return Promise.allSettled(failureList.map((f: Error) => publishToDlq(f))).then(
          () => successList || [],
          () => successList || []
        );
      } else {
        logger.info(`NoActionableEventsFound`);
        return Promise.resolve([]);
      }
    })
    .then((calendarEvents) =>
      Promise.all(
        calendarEvents.map((calendarEvent) =>
          fetchAttendeePhoneNumbers(calendarEvent, event, config)
        )
      )
    )
    .then((attendeePhoneNumbers) => {
      const actionableEvents = buildActionableEvents(attendeePhoneNumbers.flat(), event);
      return Promise.all(
        actionableEvents.map((actionableEvent) => snsService.publishEvent(actionableEvent))
      );
    })
    .then(() => {
      logger.info(
        'ActionableEventFound events derived from UserCalendarFetched event have been published'
      );
    });
}
