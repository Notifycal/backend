import { calendarSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import type { UserCalendarFetchedEvent } from './UserCalendarFetchedEvent';
import { createEventBase, runSchema } from './common';

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
    ...createEventBase(
      'NoActionableEventsFound',
      {
        userId: origin.userId,
        idp: origin.idp,
        idpId: origin.idpId
      },
      { correlationId: origin.correlationId }
    ),
    data: {
      run: origin.data.run,
      calendar: origin.data.calendar
    }
  };
}
