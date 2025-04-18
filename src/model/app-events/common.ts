import { VonageMessageStatusWebhookSchema } from '@model/vendor/vonage';
import { countryCodeSchema, rcsSenderSchema, uuidSchema } from '@notifycal/shared/schemas';
import type { RCSSenderContact } from '@notifycal/shared/types';
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
  phoneNumber: z.string().describe('Standard E.164').brand('PhoneNumberE164'),
  countryCode: countryCodeSchema
});

export const senderStandardSchema = z.union([rcsSenderSchema, phoneE164Schema]);
export const receiverStandardSchema = phoneE164Schema;

export type PhoneStandardContact = z.infer<typeof phoneE164Schema>;
export type SenderStandardContact = PhoneStandardContact | RCSSenderContact;
export type ReceiverStandardContact = PhoneStandardContact;

export const providerSentPayloadSchema = z.object({
  messageUUID: uuidSchema
});

export const providerMessageStatusPayloadSchema = z.object({
  messageStatusPayload: VonageMessageStatusWebhookSchema
});

export const providerErrorPayloadSchema = z.object({
  providerErrorPayload: z.any() // TODO: review this schema when we've replaced the Vonage SDK with Axios
});
