import { uuidSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';

/* eslint-disable camelcase */

const toNumberSchema = z.string().min(7).max(15); // phone number of the recipient. Always a phone number E164 format w/o leading +
const fromNumberSchema = z.string(); // This doesn't use the same limits as toNumber because... potato
const rcsSenderIdSchema = z.string();
const timestampSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid ISO 8601 timestamp'
});
const destinationSchema = z.object({
  network_code: z.string().optional()
});

const messageStatusErrorSchema = z.object({
  error: z.object({
    type: z.string().url(),
    title: z.string(),
    detail: z.string(),
    instance: z.string()
  })
});

const messageStatusUsageSchema = z.object({
  usage: z.object({
    currency: z.enum(['EUR']),
    price: z.string().transform(parseFloat)
  })
});

export const messageStatusSchema = z.enum(['submitted', 'delivered', 'rejected', 'undeliverable']);

const messageStatusBaseSchema = z.object({
  message_uuid: uuidSchema,
  to: toNumberSchema,
  from: fromNumberSchema,
  timestamp: timestampSchema,
  status: messageStatusSchema,
  error: messageStatusErrorSchema.optional(),
  client_ref: z.string().max(100)
});

const messageStatusSMSSchema = messageStatusBaseSchema.merge(messageStatusUsageSchema).extend({
  channel: z.literal('sms'),
  destination: destinationSchema.optional(),
  sms: z
    .object({
      count_total: z.string().transform((val) => parseInt(val))
    })
    .optional()
});

const messageStatusRCSSchema = messageStatusBaseSchema.extend({
  channel: z.literal('rcs'),
  status: z.literal('read'),
  from: rcsSenderIdSchema,
  destination: destinationSchema.optional()
});

export const VonageMessageStatusWebhookSchema = z.discriminatedUnion('channel', [
  messageStatusSMSSchema,
  messageStatusRCSSchema
]);
/* eslint-enable camelcase */
