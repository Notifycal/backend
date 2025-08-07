import {
  type EmailSendSuccessResponse,
  emailingSendSuccessPayloadResponseSchema
} from '@model/vendor/mailgun/schemas';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { type EmailToBeSentEvent, emailToBeSentEventSchema } from './EmailToBeSentEvent';
import { createEventBase } from './common';

export const emailToBeSentAttemptSentEventSchema = eventSchemaGenerator(
  'EmailToBeSentAttemptSent',
  emailToBeSentEventSchema.shape.data.extend({
    vendorResponse: emailingSendSuccessPayloadResponseSchema
  })
);

export type EmailToBeSentAttemptSentEvent = z.infer<typeof emailToBeSentAttemptSentEventSchema>;

export function emailToBeSentAttemptSentEvent(
  originalEvent: EmailToBeSentEvent,
  vendorResponse: EmailSendSuccessResponse
): EmailToBeSentAttemptSentEvent {
  return {
    ...createEventBase('EmailToBeSentAttemptSent', originalEvent, {
      correlationId: originalEvent.correlationId
    }),
    data: {
      ...originalEvent.data,
      vendorResponse
    }
  };
}
