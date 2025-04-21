import { z } from 'zod';

export const emailSendSuccessPayloadResponseSchema = z.object({
  id: z.string(),
  message: z.string()
});
export type SendSuccessResponse = z.infer<typeof emailSendSuccessPayloadResponseSchema>;

export const emailSendErrorPayloadResponse = z.object({
  errorPayload: z.any()
});
