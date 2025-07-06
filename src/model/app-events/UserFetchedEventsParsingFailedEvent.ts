import type { ParsingError } from '@model/Errors';
import { calendarSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';
import type { UserCalendarFetchedEvent } from './UserCalendarFetchedEvent';
import { errorSchema, eventIdSchema, runSchema, createEventBase, fromEvent } from './common';

const data = z.object({
  eventIdCause: eventIdSchema,
  run: runSchema,
  calendar: calendarSchema,
  error: errorSchema
});
export const userFetchedEventsParsingFailedEventSchema = errorEventSchemaGenerator(
  'UserFetchedEventsParsingFailed',
  data
);

export type UserFetchedEventsParsingFailedEvent = z.infer<
  typeof userFetchedEventsParsingFailedEventSchema
>;

export function userFetchedEventsParsingFailed(
  origin: UserCalendarFetchedEvent,
  error: ParsingError
): UserFetchedEventsParsingFailedEvent {
  return {
    ...createEventBase('UserFetchedEventsParsingFailed', fromEvent(origin), {
      correlationId: origin.correlationId
    }),
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
