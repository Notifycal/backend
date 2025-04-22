import type { Url } from '@own-types/model';
import { z } from 'zod';

export interface MailgunConfig {
  apiKey: string;
  baseUrl: Url;
  domainName: string;
}
export interface MailgunEndpointConfig {
  mailgunConfig: MailgunConfig;
}

export const emailSendSuccessPayloadResponseSchema = z.object({
  id: z.string(),
  message: z.string()
});
export type EmailSendSuccessResponse = z.infer<typeof emailSendSuccessPayloadResponseSchema>;

export const emailSendErrorPayloadResponse = z.object({
  errorPayload: z.any()
});
