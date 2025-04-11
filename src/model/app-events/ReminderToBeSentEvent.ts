import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { phoneE164Schema, senderStandardSchema } from './common';

const dataSchema = z.object({
  receiverDetails: phoneE164Schema,
  senderDetails: senderStandardSchema,
  message: z.string()
});
export const reminderToBeSentEventSchema = eventSchemaGenerator('ReminderToBeSent', dataSchema);

export type ReminderToBeSentEvent = z.infer<typeof reminderToBeSentEventSchema>;
