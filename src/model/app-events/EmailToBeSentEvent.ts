import { emailSchema } from '@notifycal/shared/schemas';
import type {
  ContentType,
  EmailHtmlBody,
  EmailInlineAttachementBase64,
  EmailSubject
} from '@own-types/model';
import { z } from 'zod';
import {
  eventSchemaGenerator,
  insufficientCreditsReminderNotSentEventType,
  lowCreditsDetectedEventType,
  noPhoneNumberForCalendarEventFoundEventType
} from './BaseEvent';
import {
  createEventBase,
  emailWithNameSchema,
  type EventCreationOptions,
  type EventSourceIdentity
} from './common';

const inlineAttachmentSchema = z.object({
  type: z.literal('inline'),
  base64Content: z.string().transform((data) => data as EmailInlineAttachementBase64),
  contentType: z.string().transform((data) => data as ContentType)
});
export type EmailInlineAttachment = z.infer<typeof inlineAttachmentSchema>;

const inlineAttachments = z.record(z.string(), inlineAttachmentSchema);

const emailSubEventTypeSchema = z.union([
  noPhoneNumberForCalendarEventFoundEventType,
  lowCreditsDetectedEventType,
  insufficientCreditsReminderNotSentEventType
]);

const dataSchema = z.object({
  from: emailWithNameSchema,
  to: emailSchema,
  subject: z.string().transform((data) => data as EmailSubject),
  htmlBody: z.string().transform((data) => data as EmailHtmlBody),
  tags: z.string().array().default([]),
  subEventType: emailSubEventTypeSchema,
  inlineAttachments: inlineAttachments,
  metadata: z.object({}).passthrough()
});
export const emailToBeSentEventSchema = eventSchemaGenerator('EmailToBeSent', dataSchema);

export type EmailToBeSentEvent = z.infer<typeof emailToBeSentEventSchema>;

export function emailToBeSent(
  userIdentity: EventSourceIdentity,
  data: EmailToBeSentEvent['data'],
  options: EventCreationOptions
): EmailToBeSentEvent {
  return {
    ...createEventBase('EmailToBeSent', userIdentity, options),
    data
  };
}
