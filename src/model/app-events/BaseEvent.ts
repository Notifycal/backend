import { dateTimeSchema, idpIdSchema, userIdSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';

export const baseEventSchema = z.object({
  userId: userIdSchema,
  idpId: idpIdSchema,
  idp: z.literal('google.com'),
  eventType: z.union([z.literal('UserCalendarFetched'), z.literal('ActionableEventFound')]),
  happenedAt: dateTimeSchema,
  eventId: z.string().uuid().brand('EventId'),
  correlationId: z.string().uuid().brand('CorrelationId')
});

export type BaseEvent = z.infer<typeof baseEventSchema>;
