import type { count } from 'sms-length';
import z from 'zod';

// Heads-up: Coercing is being applied in non string fields so that the schema can be reused in Vonage webhook event/metadata rebuilding.
export const smsLengthCountEstimateResultSchema = z.object({
  encoding: z.union([z.literal('GSM_7BIT'), z.literal('GSM_7BIT_EXT'), z.literal('UTF16')]),
  length: z.coerce.number(),
  characterPerMessage: z.coerce.number(),
  inCurrentMessage: z.coerce.number(),
  remaining: z.coerce.number(),
  messages: z.coerce.number()
});
export type SmsLengthCountEstimateResult = z.infer<typeof smsLengthCountEstimateResultSchema>;

export const _typeCheck: SmsLengthCountEstimateResult = {} as unknown as ReturnType<typeof count>;
