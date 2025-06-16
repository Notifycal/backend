import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentEventSchema } from './DemoReminderToBeSentEvent';

const dataSchema = z.object({
  originalEvent: demoReminderToBeSentEventSchema.shape.data,
  error: z.unknown()
});

export const demoReminderLowCreditNotSentEventSchema = eventSchemaGenerator(
  'DemoReminderLowCreditNotSent',
  dataSchema
);

export type DemoReminderLowCreditNotSentEventSchemaEvent = z.infer<
  typeof demoReminderLowCreditNotSentEventSchema
>;
