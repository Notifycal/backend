import { rcsContactSchema } from '@notifycal/shared/schemas';
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

export const senderSchema = z.union([rcsContactSchema, phoneE164Schema]);
