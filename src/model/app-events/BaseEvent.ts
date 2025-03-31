import { z } from 'zod';

import { dateTimeSchema, idpIdSchema, userIdSchema } from '@notifycal/shared/schemas';
import { eventIdSchema } from './common';

export const successEventTypeSchema = z.union([
  z.literal('UserCalendarFetched'),
  z.literal('ActionableEventFound'),
  z.literal('ActionableEventReminderAttemptFailed'),
  z.literal('ActionableEventReminderAttemptSent'),
  z.literal('ActionableEventReminderAttemptSkipped'),
  z.literal('ActionableEventReminderStatusUpdated'),
  z.literal('ScheduledFetchUserCalendarEventFired'),
  z.literal('UserSignedIn'),
  z.literal('UserSignedUp')
]);
export type SuccessEventType = z.infer<typeof successEventTypeSchema>;
export const errorEventTypeSchema = z.union([
  z.literal('UserFetchedEventsParsingFailed'),
  z.literal('NoPhoneNumberForAttendeeFound'),
  z.literal('NoActionableEventsFound'),
  z.literal('NoAttendeesInCalendarEventFound'),
  z.literal('NoUserCalendarFound')
]);
export type ErrorEventType = z.infer<typeof errorEventTypeSchema>;
export const eventTypeSchema = z.union([successEventTypeSchema, errorEventTypeSchema]);
export type EventType = SuccessEventType | ErrorEventType;
export const dataSchema = z.object({}).passthrough();
export type Data = z.infer<typeof dataSchema>;

const notApplicableSchema = z.literal('N/A');
export const baseEventSchema = z.object({
  userId: z.union([userIdSchema, z.literal('System')]),
  idpId: z.union([idpIdSchema, notApplicableSchema]),
  idp: z.union([z.literal('google.com'), notApplicableSchema]),
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
