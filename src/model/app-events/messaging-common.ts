import { senderSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { phoneE164Schema } from './common';

export const baseMessagingEventDataSchema = z.object({
  receiverDetails: phoneE164Schema,
  senderDetails: senderSchema,
  message: z.string()
});

export type BaseMessagingEventData = z.infer<typeof baseMessagingEventDataSchema>;
