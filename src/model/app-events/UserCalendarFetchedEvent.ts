import { calendarSchema } from '@notifycal/shared/schemas';
import type { BusinessAddress, BusinessName, TemplateId } from '@notifycal/shared/types';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { runSchema, senderStandardSchema } from './common';

const data = z.object({
  run: runSchema,
  calendar: calendarSchema,
  senderDetails: senderStandardSchema,
  template: z.object({
    id: z.string().transform((data) => data as TemplateId),
    fields: z.object({
      business: z.object({
        name: z.string().transform((data) => data as BusinessName),
        address: z.string().transform((data) => data as BusinessAddress)
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
