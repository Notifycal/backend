import type { count } from 'sms-length';
import z from 'zod';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export const smsLengthCountEstimateResultSchema = (coerced: boolean = false) => {
  const coerceableNumberSchema = coerced ? z.coerce.number() : z.number();
  return z.object({
    encoding: z.union([z.literal('GSM_7BIT'), z.literal('GSM_7BIT_EXT'), z.literal('UTF16')]),
    length: coerceableNumberSchema,
    characterPerMessage: coerceableNumberSchema,
    inCurrentMessage: coerceableNumberSchema,
    remaining: coerceableNumberSchema,
    messages: coerceableNumberSchema
  });
};
export const defaultSmsLengthCountEstimateResultSchema = smsLengthCountEstimateResultSchema();
export type SmsLengthCountEstimateResult = z.infer<
  typeof defaultSmsLengthCountEstimateResultSchema
>;

export const _typeCheck: SmsLengthCountEstimateResult = {} as unknown as ReturnType<typeof count>;
