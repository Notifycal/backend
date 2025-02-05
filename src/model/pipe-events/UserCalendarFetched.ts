import type { BusinessAddress, BusinessName, CalendarId, CalendarName, IdpId, UserId } from '@notifycal/shared/types';
import { z } from 'zod';

export const userCalendarFetchedEventSchema = z.object({
  userId: z.custom<UserId>(),
  idpId: z.string(),
  idp: z.custom<IdpId>(),
  eventType: z.literal('UserCalendarFetched'),
  eventDateTime: z.string().datetime(),
  eventId: z.string().uuid(),
  correlationId: z.string().uuid(),
  data: z.object({
    calendar: z.object({
      id: z.custom<CalendarId>(),
      name: z.custom<CalendarName>()
    }),
    templateId: z.string(),
    templateFields: z.object({
      businessName: z.custom<BusinessName>(),
      businessAddress: z.custom<BusinessAddress>()
    })
  }),
  sensitiveData: z.object({
    idpAuthorization: z.object({
      refreshToken: z.string()
    })
  })
});

