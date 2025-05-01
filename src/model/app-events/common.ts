import { countryCodeSchema, emailSchema, rcsSenderSchema } from '@notifycal/shared/schemas';
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

export const emailWithNameSchema = z.object({
  name: z.string(),
  email: emailSchema
});
export type EmailWithName = z.infer<typeof emailWithNameSchema>;
