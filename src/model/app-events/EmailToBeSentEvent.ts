import { emailSchema } from '@notifycal/shared/schemas';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';

const dataSchema = z.object({
  to: emailSchema,
  subject: z.string().brand('EmailSubject'),
  htmlBody: z.string().brand('EmailHtmlBody'),
  tags: z.string().array().default([])
});
export const emailToBeSentEventSchema = eventSchemaGenerator('EmailToBeSent', dataSchema);

export type EmailToBeSentEvent = z.infer<typeof emailToBeSentEventSchema>;
