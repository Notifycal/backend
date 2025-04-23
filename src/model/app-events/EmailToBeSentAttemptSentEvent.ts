import { mailgunEmailSendSuccessPayloadResponseSchema } from '@model/vendor/mailgun';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { emailToBeSentEventSchema } from './EmailToBeSentEvent';

export const emailToBeSentAttemptSentEventSchema = eventSchemaGenerator(
  'EmailToBeSentAttemptSent',
  emailToBeSentEventSchema.shape.data.extend({
    vendorResponse: mailgunEmailSendSuccessPayloadResponseSchema
  })
);

export type EmailToBeSentAttemptSentEvent = z.infer<typeof emailToBeSentAttemptSentEventSchema>;
