import { z } from 'zod';
import { baseEventSchema } from './BaseEvent';
import { idpAuthorizationSchema, runSchema } from '@model/schemas';

export const userCalendarFetchedEventSchema = baseEventSchema.extend({
  data: z.object({
    run: runSchema,
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
    idpAuthorization: idpAuthorizationSchema
  })
});

export type UserCalendarFetchedEvent = z.infer<typeof userCalendarFetchedEventSchema>;
