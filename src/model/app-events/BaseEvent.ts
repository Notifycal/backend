import { z } from 'zod';

import { dateTimeSchema, idpIdSchema, userIdSchema } from '@notifycal/shared/schemas';
import { eventIdSchema } from './common';

export const successEventTypeSchema = z.union([
  z.literal('UserCalendarFetched'),
  z.literal('ActionableEventFound'),
  z.literal('CalendarEventReminderAttemptSent'),
  z.literal('CalendarEventReminderAttemptSkipped')
]);
export type SuccessEventType = z.infer<typeof successEventTypeSchema>;
export const errorEventTypeSchema = z.union([
  z.literal('UserFetchedEventsParsingFailed'),
  z.literal('NoPhoneNumberForAttendeeFound')
]);
export type ErrorEventType = z.infer<typeof errorEventTypeSchema>;
export const eventTypeSchema = z.union([successEventTypeSchema, errorEventTypeSchema]);
export type EventType = SuccessEventType | ErrorEventType;
export const dataSchema = z.object({}).passthrough();
export type Data = z.infer<typeof dataSchema>;

export const baseEventSchema = z.object({
  userId: userIdSchema,
  idpId: idpIdSchema,
  idp: z.literal('google.com'),
  eventType: eventTypeSchema,
  happenedAt: dateTimeSchema,
  eventId: eventIdSchema,
  correlationId: z.string().uuid().brand('CorrelationId'),
  data: dataSchema
});
export const baseErrorEvent = baseEventSchema.extend({
  eventType: errorEventTypeSchema
});
export type BaseErrorEvent = z.infer<typeof baseErrorEvent>;
export type BaseEvent = z.infer<typeof baseEventSchema>;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function eventSchemaGenerator<TData extends z.AnyZodObject>(
  eventType: SuccessEventType,
  dataSchema: TData
) {
  return baseEventSchema.extend({
    eventType: z.literal(eventType),
    data: dataSchema
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function errorEventSchemaGenerator<TData extends z.AnyZodObject>(
  eventType: ErrorEventType,
  dataSchema: TData
) {
  return baseEventSchema.extend({
    eventType: z.literal(eventType),
    data: dataSchema
  });
}
