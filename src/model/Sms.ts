import type { count } from 'sms-length';
import z from 'zod';

export const smsLengthCountEstimateResultSchema = z.object({
  encoding: z.union([z.literal('GSM_7BIT'), z.literal('GSM_7BIT_EXT'), z.literal('UTF16')]),
  length: z.number(),
  characterPerMessage: z.number(),
  inCurrentMessage: z.number(),
  remaining: z.number(),
  messages: z.number()
});
export type SmsLengthCountEstimateResult = z.infer<typeof smsLengthCountEstimateResultSchema>;

export const _typeCheck: SmsLengthCountEstimateResult = {} as unknown as ReturnType<typeof count>;
