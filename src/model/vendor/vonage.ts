import type { Logger } from '@aws-lambda-powertools/logger';
import { logger } from '@common/powertools';
import type { VonageAccessToken } from '@lambdas/api/post-event-reminder-delivery-status-webhook/schema';
import type { Algorithm, DecodeAccessJwtEndpointConfig } from '@model/Config';
import { uuidSchema } from '@notifycal/shared/schemas';
import type { Url } from '@own-types/model';
import type {
  VonageApiKey,
  VonageApplicationId,
  VonageJwtSigningSecret
} from '@services/messaging';
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

export const VonageMessageStatusWebhookSchema = z.discriminatedUnion('channel', [
  messageStatusSMSSchema,
  messageStatusRCSSchema
]);
/* eslint-enable camelcase */

export interface VonageConfig {
  privateKeySSMPath: string;
  applicationId: VonageApplicationId;
  webhookBaseURL: Url;
}
export interface DecodeVonageAccessJwtConfig {
  applicationId: VonageApplicationId;
  apiKey: VonageApiKey;
  signingSecret: VonageJwtSigningSecret;
  algorithm: Algorithm;
  issuer: string;
}

export type DecodeVonageAccessJwtEndpointConfig =
  DecodeAccessJwtEndpointConfig<DecodeVonageAccessJwtConfig>;

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

export const providerVonageSentPayloadSchema = z.object({
  messageUUID: uuidSchema
});

export const providerVonageMessageStatusPayloadSchema = z.object({
  messageStatusPayload: VonageMessageStatusWebhookSchema
});

export const providerVonageErrorPayloadSchema = z.object({
  providerErrorPayload: z.any() // TODO: review this schema when we've replaced the Vonage SDK with Axios
});
