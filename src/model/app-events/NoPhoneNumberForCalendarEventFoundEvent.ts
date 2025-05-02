import { calendarEventSchema, calendarSchema } from '@notifycal/shared/schemas';
import type { CalendarEvent, DateTime, EventId } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import type { UserCalendarFetchedEvent } from './UserCalendarFetchedEvent';
import { eventIdSchema, runSchema } from './common';

const data = z.object({
  eventIdCause: eventIdSchema,
  run: runSchema,
  calendar: calendarSchema,
  calendarEvent: calendarEventSchema
});
export const noPhoneNumberForCalendarEventFoundEventSchema = eventSchemaGenerator(
  'NoPhoneNumberForCalendarEventFound',
  data
);

export type NoPhoneNumberForCalendarEventFoundEvent = z.infer<
  typeof noPhoneNumberForCalendarEventFoundEventSchema
>;

export function noPhoneNumberForCalendarEventFound(
  origin: UserCalendarFetchedEvent,
  calendarEvent: CalendarEvent
): NoPhoneNumberForCalendarEventFoundEvent {
  return {
    eventId: v4() as EventId,
    correlationId: origin.correlationId,
    eventType: 'NoPhoneNumberForCalendarEventFound',
    happenedAt: new Date().toISOString() as DateTime,
    userId: origin.userId,
    idp: origin.idp,
    idpId: origin.idpId,
    data: {
      eventIdCause: origin.eventId,
      run: origin.data.run,
      calendar: origin.data.calendar,
      calendarEvent: calendarEvent
    }
  };
}
