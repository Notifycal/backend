import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { emailWithNameSchema } from './common';

const dataSchema = z.object({
  to: emailWithNameSchema,
  subject: z.string().brand('EmailSubject'),
  htmlBody: z.string().brand('EmailHtmlBody'),
  tags: z.string().array().default([])
});
export const emailToBeSentEventSchema = eventSchemaGenerator('EmailToBeSent', dataSchema);

export type EmailToBeSentEvent = z.infer<typeof emailToBeSentEventSchema>;
