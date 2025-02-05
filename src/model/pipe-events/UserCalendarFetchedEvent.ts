import { z } from 'zod';
import { genericPipeEventSchema } from './GenericPipeEvent';

export const userCalendarFetchedEventSchema = genericPipeEventSchema.extend({
  data: z.object({
    calendar: z.object({
      id: z.string().brand('CalendarId'),
      name: z.string().brand('CalendarName')
    }),
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
      refreshToken: z.string().brand('RefreshToken')
    })
  })
});

export type UserCalendarFetchedEvent = z.infer<typeof userCalendarFetchedEventSchema>;
