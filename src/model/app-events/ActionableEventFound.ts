import { calendarEventSchema, calendarSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { baseEventSchema } from './BaseEvent';

export const actionableEventFoundEventSchema = baseEventSchema.extend({
  data: z.object({
    run: z.object({
      lowerBoundStartTime: z.string().brand('DateTime'),
      upperBoundStartTime: z.string().brand('DateTime')
    }),
    calendar: calendarSchema,
    event: calendarEventSchema,
    contactDetails: z.object({
      type: z.literal('phone'),
      number: z.string().brand('PhoneNumber')
    }),
    message: z.string()
  }),
  sensitiveData: z.object({
    idpAuthorization: z.object({
      refreshToken: z.string()
    })
  })
});

export type ActionableEventFoundEvent = z.infer<typeof actionableEventFoundEventSchema>;
