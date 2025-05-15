import { emailSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { eventSchemaGenerator, noPhoneNumberForCalendarEventFoundEventType } from './BaseEvent';
import { emailWithNameSchema } from './common';

const inlineAttachmentSchema = z.object({
  type: z.literal('inline'),
  base64Content: z.string().brand('EmailInlineAttachementBase64'),
  contentType: z.string().brand('ContentType')
});
export type EmailInlineAttachment = z.infer<typeof inlineAttachmentSchema>;

const inlineAttachments = z.record(inlineAttachmentSchema);

const dataSchema = z.object({
  from: emailWithNameSchema,
  to: emailSchema,
  subject: z.string().brand('EmailSubject'),
  htmlBody: z.string().brand('EmailHtmlBody'),
  tags: z.string().array().default([]),
  subEventType: noPhoneNumberForCalendarEventFoundEventType,
  inlineAttachments: inlineAttachments,
  metadata: z.object({}).passthrough()
});
export const emailToBeSentEventSchema = eventSchemaGenerator('EmailToBeSent', dataSchema);

export type EmailToBeSentEvent = z.infer<typeof emailToBeSentEventSchema>;
