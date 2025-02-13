import { calendarSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { baseEventSchema } from './BaseEvent';

export const userCalendarFetchedEventSchema = baseEventSchema.extend({
  data: z.object({
    run: z.object({
      lowerBoundStartTime: z.string().brand('DateTime'),
      upperBoundStartTime: z.string().brand('DateTime')
    }),
    calendar: calendarSchema,
    template: z.object({
      id: z.string().brand('TemplateId'),
      fields: z.object({
        business: z.object({
          name: z.string().brand('BusinessName'),
          address: z.string().brand('BusinessAddress')
        })
      })
    })
  }),
  sensitiveData: z.object({
    idpAuthorization: z.object({
      refreshToken: z.string()
    })
  })
});

export type UserCalendarFetchedEvent = z.infer<typeof userCalendarFetchedEventSchema>;
