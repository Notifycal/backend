import { countryCodeSchema, emailSchema, rcsSenderSchema } from '@notifycal/shared/schemas';
import type {
  CorrelationId,
  DateTime,
  EventId,
  IdpId,
  IdpName,
  RCSSenderContact,
  UserId
} from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { v4 } from 'uuid';
import { z } from 'zod';
import type { EventType } from './BaseEvent';

export const errorSchema = z.object({
  message: z.string(),
  cause: z.object({}).passthrough()
});

export const runSchema = z.object({
  lowerBoundStartTime: z.string().transform((data) => data as DateTime),
  upperBoundStartTime: z.string().transform((data) => data as DateTime),
  slidingWindowInMinutes: z.number().int().positive()
});

export const eventIdSchema = z
  .string()
  .uuid()
  .transform((data) => data as EventId);

export const phoneE164Schema = z.object({
  type: z.literal('phone'),
  phoneNumber: z
    .string()
    .describe('Standard E.164')
    .transform((data) => data as PhoneNumberE164),
  countryCode: countryCodeSchema
});

export const senderStandardSchema = z.union([rcsSenderSchema, phoneE164Schema]);
export const receiverStandardSchema = phoneE164Schema;

export type PhoneStandardContact = z.infer<typeof phoneE164Schema>;
export type SenderStandardContact = PhoneStandardContact | RCSSenderContact;
export type ReceiverStandardContact = PhoneStandardContact;

export const emailWithNameSchema = z.object({
  name: z.string(),
  email: emailSchema
});
export type EmailWithName = z.infer<typeof emailWithNameSchema>;

export interface EventSourceIdentity {
  userId: UserId;
  idp: IdpName;
  idpId: IdpId;
}

export interface EventCreationOptions {
  correlationId?: CorrelationId;
  happenedAt?: DateTime;
}

export function createEventBase<TEventType extends EventType>(
  eventType: TEventType,
  source: EventSourceIdentity,
  options: EventCreationOptions = {}
): {
  eventId: EventId;
  correlationId: CorrelationId;
  eventType: TEventType;
  happenedAt: DateTime;
  userId: UserId;
  idp: 'google.com';
  idpId: IdpId;
} {
  const eventId = v4();
  return {
    eventId: eventId as EventId,
    correlationId: options.correlationId ?? (eventId as CorrelationId),
    eventType,
    happenedAt: options.happenedAt ?? (new Date().toISOString() as DateTime),
    userId: source.userId,
    idp: source.idp,
    idpId: source.idpId
  };
}
