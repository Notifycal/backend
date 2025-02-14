import { dateTimeSchema, idpIdSchema, userIdSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';

const eventType = z.union([
  z.literal('UserCalendarFetched'),
  z.literal('ActionableEventFound'),
  z.literal('UserFetchedEventsParsingFailed'),
  z.literal('NoPhoneNumberForAttendeeFound')
]);
export type EventType = z.infer<typeof eventType>;

export const eventIdSchema = z.string().uuid().brand('EventId');
export const dataSchema = z.object({}).passthrough();
export type Data = z.infer<typeof dataSchema>;

export const baseEventSchema = z.object({
  userId: userIdSchema,
  idpId: idpIdSchema,
  idp: z.literal('google.com'),
  eventType: eventType,
  happenedAt: dateTimeSchema,
  eventId: eventIdSchema,
  correlationId: z.string().uuid().brand('CorrelationId'),
  data: z.object({}).passthrough(),
  sensitiveData: z.object({}).passthrough()
});

export type BaseEvent = z.infer<typeof baseEventSchema>;
