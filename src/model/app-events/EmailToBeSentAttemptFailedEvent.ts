import { mailgunEmailSendErrorPayloadResponse } from '@model/vendor/mailgun/schemas';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { emailToBeSentEventSchema } from './EmailToBeSentEvent';

export const emailToBeSentAttemptFailedEventSchema = eventSchemaGenerator(
  'EmailToBeSentAttemptFailed',
  emailToBeSentEventSchema.shape.data.extend(mailgunEmailSendErrorPayloadResponse.shape)
);

export type EmailToBeSentAttemptFailedEvent = z.infer<typeof emailToBeSentAttemptFailedEventSchema>;
