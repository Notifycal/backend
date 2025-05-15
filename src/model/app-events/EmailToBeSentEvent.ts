import { emailSchema } from '@notifycal/shared/schemas';
import type {
  ContentType,
  EmailHtmlBody,
  EmailInlineAttachementBase64,
  EmailSubject
} from '@own-types/model';
import { z } from 'zod';
import { eventSchemaGenerator, noPhoneNumberForCalendarEventFoundEventType } from './BaseEvent';
import { emailWithNameSchema } from './common';

const inlineAttachmentSchema = z.object({
  type: z.literal('inline'),
  base64Content: z.string().transform((data) => data as EmailInlineAttachementBase64),
  contentType: z.string().transform((data) => data as ContentType)
});
export type EmailInlineAttachment = z.infer<typeof inlineAttachmentSchema>;

const inlineAttachments = z.record(inlineAttachmentSchema);

const dataSchema = z.object({
  from: emailWithNameSchema,
  to: emailSchema,
  subject: z.string().transform((data) => data as EmailSubject),
  htmlBody: z.string().transform((data) => data as EmailHtmlBody),
  tags: z.string().array().default([]),
  subEventType: noPhoneNumberForCalendarEventFoundEventType,
  inlineAttachments: inlineAttachments,
  metadata: z.object({}).passthrough()
});
export const emailToBeSentEventSchema = eventSchemaGenerator('EmailToBeSent', dataSchema);

export type EmailToBeSentEvent = z.infer<typeof emailToBeSentEventSchema>;
