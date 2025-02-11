import { idpIdSchema, userIdSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';

export type PipeEvents = 'UserCalendarFetched' | 'ActionableEventFound';

export const baseEventSchema = z.object({
  userId: userIdSchema,
  idpId: idpIdSchema,
  idp: z.literal('google.com'),
  eventType: z.literal('UserCalendarFetched'),
  happenedAt: z.string().datetime().brand('DateTime'),
  eventId: z.string().uuid().brand('EventId'),
  correlationId: z.string().uuid().brand('CorrelationId')
});

export type BaseEvent = z.infer<typeof baseEventSchema>;
