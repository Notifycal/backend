import { calendarSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { baseEventSchema } from './BaseEvent';
import { contactDetailsSchema, runSchema } from './common';

export const userCalendarFetchedEventSchema = baseEventSchema.extend({
  data: z.object({
    run: runSchema,
    calendar: calendarSchema,
    template: z.object({
      id: z.string().brand('TemplateId'),
      fields: z.object({
        business: z.object({
          name: z.string().brand('BusinessName'),
          address: z.string().brand('BusinessAddress')
        })
      })
    }),
    senderDetails: contactDetailsSchema
  }),
  sensitiveData: z.object({
    idpAuthorization: z.object({
      refreshToken: z.string()
    })
  })
});

export type UserCalendarFetchedEvent = z.infer<typeof userCalendarFetchedEventSchema>;
