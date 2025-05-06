import { emailSchema } from '@notifycal/shared/schemas';
import type { DateTime, EventId } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import type { ActionableEventFoundEvent } from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';
import type { NoPhoneNumberForCalendarEventFoundEvent } from './NoPhoneNumberForCalendarEventFoundEvent';

const dataSchema = z.object({
  to: emailSchema,
  subject: z.string().brand('EmailSubject'),
  htmlBody: z.string().brand('EmailHtmlBody'),
  tags: z.string().array().default([])
});
export const emailToBeSentEventSchema = eventSchemaGenerator('EmailToBeSent', dataSchema);

export type EmailToBeSentEvent = z.infer<typeof emailToBeSentEventSchema>;

export function emailToBeSent(
  origin: ActionableEventFoundEvent | NoPhoneNumberForCalendarEventFoundEvent,
  data: EmailToBeSentEvent['data']
): EmailToBeSentEvent {
  return {
    eventId: v4() as EventId,
    correlationId: origin.correlationId,
    eventType: 'EmailToBeSent',
    happenedAt: new Date().toISOString() as DateTime,
    userId: origin.userId,
    idp: origin.idp,
    idpId: origin.idpId,
    data: data
  };
}
