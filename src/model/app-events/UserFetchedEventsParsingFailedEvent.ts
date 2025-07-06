import type { ParsingError } from '@model/Errors';
import { calendarSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';
import type { UserCalendarFetchedEvent } from './UserCalendarFetchedEvent';
import {
  createEventBase,
  errorSchema,
  eventIdSchema,
  runSchema,
  toEventSourceIdentity
} from './common';

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
    ...createEventBase('UserFetchedEventsParsingFailed', toEventSourceIdentity(origin), {
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
