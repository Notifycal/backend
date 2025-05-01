import { emailingSendSuccessPayloadResponseSchema } from '@model/vendor/mailgun/schemas';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { emailToBeSentEventSchema } from './EmailToBeSentEvent';

export const emailToBeSentAttemptSentEventSchema = eventSchemaGenerator(
  'EmailToBeSentAttemptSent',
  emailToBeSentEventSchema.shape.data.extend({
    vendorResponse: emailingSendSuccessPayloadResponseSchema
  })
);

export type EmailToBeSentAttemptSentEvent = z.infer<typeof emailToBeSentAttemptSentEventSchema>;
