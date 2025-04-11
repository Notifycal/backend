import { calendarSchema, countryCodeSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { runSchema, senderStandardSchema } from './common';

const data = z.object({
  run: runSchema,
  calendar: calendarSchema,
  senderDetails: senderStandardSchema,
  senderCountryCode: countryCodeSchema,
  template: z.object({
    id: z.string().brand('TemplateId'),
    fields: z.object({
      business: z.object({
        name: z.string().brand('BusinessName'),
        address: z.string().brand('BusinessAddress')
      })
    })
  })
});
const sensitiveData = z.object({
  idpAuthorization: z.object({
    refreshToken: z.string()
  })
});
export const userCalendarFetchedEventSchema = eventSchemaGenerator(
  'UserCalendarFetched',
  data
).extend({
  sensitiveData: sensitiveData
});

export type UserCalendarFetchedEvent = z.infer<typeof userCalendarFetchedEventSchema>;
