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
    senderDetails: contactDetailsSchema,
    message: z.string()
  })
});

export type ActionableEventFoundEvent = z.infer<typeof actionableEventFoundEventSchema>;
