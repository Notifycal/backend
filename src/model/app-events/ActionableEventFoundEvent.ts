import { calendarEventSchema, calendarSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { runSchema } from './common';

const dataSchema = z.object({
  run: runSchema,
  calendar: calendarSchema,
  calendarEvent: calendarEventSchema,
  receiverDetails: z.object({
    type: z.literal('phone'),
    number: z.string().brand('PhoneNumber')
  }),
  message: z.string()
});
export const actionableEventFoundEventSchema = eventSchemaGenerator(
  'ActionableEventFound',
  dataSchema,
  z.object({}).strict()
);

export type ActionableEventFoundEvent = z.infer<typeof actionableEventFoundEventSchema>;
