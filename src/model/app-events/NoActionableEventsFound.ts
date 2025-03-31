import { calendarSchema } from '@notifycal/shared/schemas';
import type { DateTime, EventId } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';
import type { UserCalendarFetchedEvent } from './UserCalendarFetchedEvent';
import { eventIdSchema, runSchema } from './common';

const data = z.object({
  eventIdCause: eventIdSchema,
  run: runSchema,
  calendar: calendarSchema
});
export const noActionableEventsFoundEventSchema = errorEventSchemaGenerator(
  'NoUserCalendarFound',
  data
);

export type noActionableEventsFoundEvent = z.infer<typeof noActionableEventsFoundEventSchema>;

export function noActionableEventsFound(
  origin: UserCalendarFetchedEvent
): noActionableEventsFoundEvent {
  return {
    eventId: v4() as EventId,
    correlationId: origin.correlationId,
    eventType: 'NoUserCalendarFound',
    happenedAt: new Date().toISOString() as DateTime,
    userId: origin.userId,
    idp: origin.idp,
    idpId: origin.idpId,
    data: {
      eventIdCause: origin.eventId,
      run: origin.data.run,
      calendar: origin.data.calendar
    }
  };
}
