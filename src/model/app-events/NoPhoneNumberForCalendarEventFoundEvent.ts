import { calendarEventSchema, calendarSchema } from '@notifycal/shared/schemas';
import type { CalendarEvent } from '@notifycal/shared/types';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import type { UserCalendarFetchedEvent } from './UserCalendarFetchedEvent';
import { eventIdSchema, runSchema, createEventBase, toEventSourceIdentity } from './common';

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
    ...createEventBase('NoPhoneNumberForCalendarEventFound', toEventSourceIdentity(origin), {
      correlationId: origin.correlationId
    }),
    data: {
      eventIdCause: origin.eventId,
      run: origin.data.run,
      calendar: origin.data.calendar,
      calendarEvent: calendarEvent
    }
  };
}
