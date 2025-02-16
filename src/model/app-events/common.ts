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

export const contactDetailsSchema = z.object({
  type: z.literal('phone'),
  number: z.string().brand('PhoneNumber')
});
