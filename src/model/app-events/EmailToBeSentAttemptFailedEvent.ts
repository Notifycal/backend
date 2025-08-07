import { emailingSendErrorPayloadResponse } from '@model/vendor/mailgun/schemas';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';
import { type EmailToBeSentEvent, emailToBeSentEventSchema } from './EmailToBeSentEvent';

export const emailToBeSentAttemptFailedEventSchema = eventSchemaGenerator(
  'EmailToBeSentAttemptFailed',
  emailToBeSentEventSchema.shape.data.extend(emailingSendErrorPayloadResponse.shape)
);

export type EmailToBeSentAttemptFailedEvent = z.infer<typeof emailToBeSentAttemptFailedEventSchema>;

export function emailToBeSentAttemptFailedEvent(
  originalEvent: EmailToBeSentEvent,
  errorPayload: string
): EmailToBeSentAttemptFailedEvent {
  return {
    ...createEventBase('EmailToBeSentAttemptFailed', originalEvent, {
      correlationId: originalEvent.correlationId
    }),
    data: {
      ...originalEvent.data,
      errorPayload
    }
  };
}
