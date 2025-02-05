import { z } from 'zod';

export type PipeEvents = 'UserCalendarFetched' | 'ActionableEventFound';

export const genericPipeEventSchema = z.object({
  userId: z.string().brand('UserId'),
  idpId: z.string().brand('IdpId'),
  idp: z.string().brand('Idp'),
  eventType: z.literal('UserCalendarFetched'),
  eventDateTime: z.string().datetime().brand('EventDateTime'),
  eventId: z.string().uuid().brand('EventId'),
  correlationId: z.string().uuid().brand('CorrelationId'),
});

export type GenericPipeEvent = z.infer<typeof genericPipeEventSchema>
