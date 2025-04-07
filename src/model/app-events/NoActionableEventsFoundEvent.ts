import { calendarSchema } from '@notifycal/shared/schemas';
import type { DateTime, EventId } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import type { UserCalendarFetchedEvent } from './UserCalendarFetchedEvent';
import { runSchema } from './common';

const data = z.object({
  run: runSchema,
  calendar: calendarSchema
});
export const noActionableEventsFoundEventSchema = eventSchemaGenerator(
  'NoActionableEventsFound',
  data
);

export type NoActionableEventsFoundEvent = z.infer<typeof noActionableEventsFoundEventSchema>;

export function noActionableEventsFound(
  origin: UserCalendarFetchedEvent
): NoActionableEventsFoundEvent {
  return {
    eventId: v4() as EventId,
    correlationId: origin.correlationId,
    eventType: 'NoActionableEventsFound',
    happenedAt: new Date().toISOString() as DateTime,
    userId: origin.userId,
    idp: origin.idp,
    idpId: origin.idpId,
    data: {
      run: origin.data.run,
      calendar: origin.data.calendar
    }
  };
}
