import type { ParsingError } from '@model/Errors';
import { calendarSchema } from '@notifycal/shared/schemas';
import type { DateTime, EventId } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import { baseErrorEventSchema } from './BaseErrorEvent';
import { eventIdSchema } from './BaseEvent';
import type { UserCalendarFetchedEvent } from './UserCalendarFetchedEvent';
import { errorSchema, runSchema } from './common';

export const userFetchedEventsParsingFailedEventSchema = baseErrorEventSchema.extend({
  data: z.object({
    eventIdCause: eventIdSchema,
    run: runSchema,
    calendar: calendarSchema,
    error: errorSchema
  })
});

export type UserFetchedEventsParsingFailedEvent = z.infer<typeof userFetchedEventsParsingFailedEventSchema>;

export function userFetchedEventsParsingFailed(
  origin: UserCalendarFetchedEvent,
  error: ParsingError
): UserFetchedEventsParsingFailedEvent {
  return {
    eventId: v4() as EventId,
    correlationId: origin.correlationId,
    eventType: 'UserFetchedEventsParsingFailed',
    happenedAt: new Date().toISOString() as DateTime,
    userId: origin.userId,
    idp: origin.idp,
    idpId: origin.idpId,
    data: {
      eventIdCause: origin.eventId,
      run: origin.data.run,
      calendar: origin.data.calendar,
      error: {
        message: error.message,
        cause: error.item
      }
    }
  };
}
