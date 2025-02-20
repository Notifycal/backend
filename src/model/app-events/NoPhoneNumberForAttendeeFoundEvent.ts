import { calendarEventSchema, calendarSchema } from '@notifycal/shared/schemas';
import type { CalendarEvent, DateTime, EventId } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';
import type { UserCalendarFetchedEvent } from './UserCalendarFetchedEvent';
import { eventIdSchema, runSchema } from './common';

const data = z.object({
  eventIdCause: eventIdSchema,
  run: runSchema,
  calendar: calendarSchema,
  calendarEvent: calendarEventSchema,
  attendeeId: z.string()
});
export const noPhoneNumberForAttendeeFoundEventSchema = errorEventSchemaGenerator(
  'NoPhoneNumberForAttendeeFound',
  data,
  z.object({}).strict()
);

export type NoPhoneNumberForAttendeeFoundEvent = z.infer<
  typeof noPhoneNumberForAttendeeFoundEventSchema
>;

export function noPhoneNumberForAttendeeFound(
  origin: UserCalendarFetchedEvent,
  calendarEvent: CalendarEvent,
  attendeeId: string
): NoPhoneNumberForAttendeeFoundEvent {
  return {
    eventId: v4() as EventId,
    correlationId: origin.correlationId,
    eventType: 'NoPhoneNumberForAttendeeFound',
    happenedAt: new Date().toISOString() as DateTime,
    userId: origin.userId,
    idp: origin.idp,
    idpId: origin.idpId,
    data: {
      eventIdCause: origin.eventId,
      run: origin.data.run,
      calendar: origin.data.calendar,
      calendarEvent: calendarEvent,
      attendeeId: attendeeId
    },
    sensitiveData: {}
  };
}
