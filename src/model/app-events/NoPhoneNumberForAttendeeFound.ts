import { calendarEventSchema, calendarSchema } from '@notifycal/shared/schemas';
import type { CalendarEvent, DateTime, EventId } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import { baseErrorEventSchema } from './BaseErrorEvent';
import { eventIdSchema } from './BaseEvent';
import type { UserCalendarFetchedEvent } from './UserCalendarFetchedEvent';
import { runSchema } from './common';

export const noPhoneNumberForAttendeeFoundSchema = baseErrorEventSchema.extend({
  data: z.object({
    eventIdCause: eventIdSchema,
    run: runSchema,
    calendar: calendarSchema,
    calendarEvent: calendarEventSchema,
    attendeeId: z.string()
  })
});

export type NoPhoneNumberForAttendeeFound = z.infer<typeof noPhoneNumberForAttendeeFoundSchema>;

export function noPhoneNumberForAttendeeFound(
  origin: UserCalendarFetchedEvent,
  calendarEvent: CalendarEvent,
  attendeeId: string
): NoPhoneNumberForAttendeeFound {
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
