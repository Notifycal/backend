import { calendarEventSchema, calendarSchema } from '@notifycal/shared/schemas';
import { idpAuthorizationSchema, runSchema } from '@model/schemas';
import { z } from 'zod';
import { baseEventSchema } from './BaseEvent';

export const actionableEventFoundEventSchema = baseEventSchema.extend({
  data: z.object({
    run: runSchema,
    calendar: calendarSchema,
    event: calendarEventSchema,
    contactDetails: z.object({
      type: z.literal('phone'),
      number: z.string().brand('PhoneNumber')
    }),
    message: z.string()
  }),
  sensitiveData: z.object({
    idpAuthorization: idpAuthorizationSchema
  })
});

export type ActionableEventFoundEvent = z.infer<typeof actionableEventFoundEventSchema>;
