import { z } from 'zod';

export const emailingSendSuccessPayloadResponseSchema = z.object({
  id: z.string(),
  message: z.string()
});
export type EmailSendSuccessResponse = z.infer<typeof emailingSendSuccessPayloadResponseSchema>;

export const emailingSendErrorPayloadResponse = z.object({
  errorPayload: z.any()
});
