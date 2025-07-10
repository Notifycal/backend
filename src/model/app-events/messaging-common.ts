import { z } from 'zod';
import { phoneE164Schema, senderStandardSchema } from './common';

export const baseMessagingEventDataSchema = z.object({
  receiverDetails: phoneE164Schema,
  senderDetails: senderStandardSchema,
  message: z.string()
});

export type BaseMessagingEventData = z.infer<typeof baseMessagingEventDataSchema>;
