import { z } from 'zod';

export const errorSchema = z.object({
  message: z.string(),
  cause: z.object({}).passthrough()
});

export const runSchema = z.object({
  lowerBoundStartTime: z.string().brand('DateTime'),
  upperBoundStartTime: z.string().brand('DateTime'),
  slidingWindowInMinutes: z.coerce.number().int().positive()
});

export const eventIdSchema = z.string().uuid().brand('EventId');

export const receiverSchema = z.object({
  type: z.literal('phone'),
  identifier: z.string().brand('PhoneNumber')
});

const rcsSenderSchema = z.object({
  type: z.literal('rcs_sender_id'),
  identifier: z.string().brand('RCSSenderId')
});

const smsSenderSchema = receiverSchema;

export const senderSchema = z.discriminatedUnion('type', [rcsSenderSchema, smsSenderSchema]);

export type MessageReceiver = z.infer<typeof receiverSchema>;
export type MessageSender = z.infer<typeof senderSchema>;
