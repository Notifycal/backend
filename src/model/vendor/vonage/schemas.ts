import type { Logger } from '@aws-lambda-powertools/logger';
import { logger } from '@common/powertools';
import { uuidSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import type { VonageAccessToken } from './config';

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
  usage: z
    .object({
      currency: z.enum(['EUR']),
      price: z.coerce.number()
    })
    .optional()
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
      count_total: z.coerce.number()
    })
    .optional()
});

const messageStatusRCSSchema = messageStatusBaseSchema.extend({
  channel: z.literal('rcs'),
  status: z.literal('read'),
  from: rcsSenderIdSchema,
  destination: destinationSchema.optional()
});

export const vonageMessageStatusWebhookSchema = z.discriminatedUnion('channel', [
  messageStatusSMSSchema,
  messageStatusRCSSchema
]);
/* eslint-enable camelcase */

export const vonageAccessTokenSchema = z.object({
  header: z.object({
    alg: z.string(),
    typ: z.string()
  }),
  payload: z.object({
    jti: z.string(),
    iat: z.number(),
    iss: z.string(),
    // eslint-disable-next-line camelcase
    api_key: z.string(),
    // eslint-disable-next-line camelcase
    application_id: z.string(),
    // eslint-disable-next-line camelcase
    payload_hash: z.string().optional()
  }),
  signature: z.string()
});

export function setupLoggerForAuthedVonageApiRequest(
  jwt: VonageAccessToken,
  _logger: Logger = logger
): void {
  _logger.appendKeys({
    vendor: 'Vonage',
    applicationId: jwt.payload.application_id,
    apiKey: jwt.payload.api_key
  });
}

export const vonageSentPayloadSchema = z.object({
  messageUUID: uuidSchema
});

export const vonageMessageStatusPayloadSchema = z.object({
  messageStatusPayload: vonageMessageStatusWebhookSchema
});

export const vonageErrorPayloadSchema = z.object({
  providerErrorPayload: z.any() // TODO: review this schema when we've replaced the Vonage SDK with Axios
});
