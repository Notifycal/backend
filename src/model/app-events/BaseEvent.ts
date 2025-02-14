import { dateTimeSchema, idpIdSchema, userIdSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';

const eventTypes = z.union([
  z.literal('UserCalendarFetched'),
  z.literal('ActionableEventFound'),
  z.literal('UserFetchedEventsParsingFailed'),
  z.literal('NoPhoneNumberForAttendeeFound')
]);

export const eventIdSchema = z.string().uuid().brand('EventId');

export const baseEventSchema = z.object({
  userId: userIdSchema,
  idpId: idpIdSchema,
  idp: z.literal('google.com'),
  eventType: eventTypes,
  happenedAt: dateTimeSchema,
  eventId: eventIdSchema,
  correlationId: z.string().uuid().brand('CorrelationId')
});

export type BaseEvent = z.infer<typeof baseEventSchema>;
