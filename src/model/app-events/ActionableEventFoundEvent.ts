import { calendarEventSchema, calendarSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { baseEventSchema } from './BaseEvent';
import { contactDetailsSchema, runSchema } from './common';

export const actionableEventFoundEventSchema = baseEventSchema.extend({
  data: z.object({
    run: runSchema,
    calendar: calendarSchema,
    event: calendarEventSchema,
    receiverDetails: contactDetailsSchema,
    message: z.string()
  }),
  sensitiveData: z.object({
    idpAuthorization: z.object({
      refreshToken: z.string()
    })
  })
});

export type ActionableEventFoundEvent = z.infer<typeof actionableEventFoundEventSchema>;
