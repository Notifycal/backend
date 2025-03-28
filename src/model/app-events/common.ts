import { rcsSenderSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';

export const errorSchema = z.object({
  message: z.string(),
  cause: z.object({}).passthrough()
});

export const runSchema = z.object({
  lowerBoundStartTime: z.string().brand('DateTime'),
  upperBoundStartTime: z.string().brand('DateTime'),
  slidingWindowInMinutes: z.number().int().positive()
});

export const eventIdSchema = z.string().uuid().brand('EventId');

export const phoneE164Schema = z.object({
  type: z.literal('phone'),
  phoneNumber: z.string().describe('Standard E.164').brand('PhoneNumberE164')
});

// export const senderSchema = z.discriminatedUnion('type', [rcsSenderSchema, smsSenderSchema]);
export const senderStandardSchema = z.union([rcsSenderSchema, phoneE164Schema]);
export const receiverStandardSchema = phoneE164Schema;

export type MessageReceiver = z.infer<typeof receiverStandardSchema>;
export type MessageSender = z.infer<typeof senderStandardSchema>;
