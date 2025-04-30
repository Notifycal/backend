import { z } from 'zod';

export const mailgunEmailSendSuccessPayloadResponseSchema = z.object({
  id: z.string(),
  message: z.string()
});
export type EmailSendSuccessResponse = z.infer<typeof mailgunEmailSendSuccessPayloadResponseSchema>;

export const mailgunEmailSendErrorPayloadResponse = z.object({
  errorPayload: z.any()
});
