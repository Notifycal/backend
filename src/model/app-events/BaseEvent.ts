import { z } from 'zod';

import { dateTimeSchema, idpIdSchema, userIdSchema } from '@notifycal/shared/schemas';
import type { CorrelationId } from '@notifycal/shared/types';
import { eventIdSchema } from './common';
import { ourStripeEventTypeZodLiteralArray } from './StripeWebhookEventFiredEvent';

// Docs: take your time to decide what type of event you are defining and what is aimed at. Pay attention to these silver bullets:
// SuccessEvent:
//  - informing the next step of the process to achieve an overarching goal.
//  - flagging out of ordinary happen that cannot be considered a failure given the input data. Is the intention behind flagging it informing the end user?
// ErrorEvent:
//  - something unexpected happened and the error was caught
//  - wrong user data
// SystemEvent:
//  - a priori, movements initiated by AWS. So, AWS wrappers in simple words.
export const noPhoneNumberForCalendarEventFoundEventType = z.literal(
  'NoPhoneNumberForCalendarEventFound'
);

export const successEventTypeSchema = z.union([
  z.literal('UserCalendarFetched'),
  z.literal('ActionableEventFound'),
  z.literal('ActionableEventReminderAttemptFailed'),
  z.literal('ActionableEventReminderAttemptSent'),
  z.literal('ActionableEventReminderAttemptSkipped'),
  z.literal('ActionableEventReminderStatusUpdated'),
  z.literal('ActionableEventReminderInsufficientCreditNotSent'),
  z.literal('DemoReminderToBeSent'),
  z.literal('DemoReminderToBeSentAttemptFailed'),
  z.literal('DemoReminderToBeSentAttemptSent'),
  z.literal('DemoReminderToBeSentAttemptSkipped'),
  z.literal('DemoReminderToBeSentStatusUpdated'),
  z.literal('DemoReminderLimitReachedNotSent'),
  z.literal('UserSignInSucceeded'),
  z.literal('UserSignUpSucceeded'),
  noPhoneNumberForCalendarEventFoundEventType,
  z.literal('NoActionableEventsFound'),
  z.literal('NoUserCalendarFound'),
  z.literal('EmailToBeSent'),
  z.literal('EmailToBeSentAttemptSent'),
  z.literal('EmailToBeSentAttemptSkipped'),
  z.literal('EmailToBeSentAttemptFailed'),
  ...ourStripeEventTypeZodLiteralArray
]);
export const errorEventTypeSchema = z.union([
  z.literal('UserFetchedEventsParsingFailed'),
  z.literal('UserSignInFailed'),
  z.literal('UserSignUpFailed')
]);
export const systemEventTypeSchema = z.literal('ScheduledFetchUserCalendarEventFired');
export type SuccessEventType = z.infer<typeof successEventTypeSchema>;
export type SystemEventType = z.infer<typeof systemEventTypeSchema>;
export type ErrorEventType = z.infer<typeof errorEventTypeSchema>;
export const eventTypeSchema = z.union([successEventTypeSchema, errorEventTypeSchema]);
export type EventType = SuccessEventType | ErrorEventType;
export const dataSchema = z.object({}).passthrough();
export type Data = z.infer<typeof dataSchema>;
export const googleIdpSchema = z.literal('google.com');
export const correlationIdSchema = z
  .string()
  .uuid()
  .transform((data) => data as CorrelationId);
export const notApplicableSchema = z.literal('N/A');
export const systemSchema = z.literal('System');

export const baseEventSchema = z.object({
  userId: userIdSchema,
  idpId: idpIdSchema,
  idp: googleIdpSchema,
  eventType: eventTypeSchema,
  happenedAt: dateTimeSchema,
  eventId: eventIdSchema,
  correlationId: correlationIdSchema,
  data: dataSchema
});
export const baseSystemEventSchema = baseEventSchema.extend({
  userId: systemSchema,
  idpId: notApplicableSchema,
  idp: notApplicableSchema,
  eventType: systemEventTypeSchema
});
export const baseErrorEvent = baseEventSchema.extend({
  eventType: errorEventTypeSchema
});
export type BaseErrorEvent = z.infer<typeof baseErrorEvent>;
export type BaseEvent = z.infer<typeof baseEventSchema>;
export type BaseSystemEvent = z.infer<typeof baseSystemEventSchema>;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function eventSchemaGenerator<
  TData extends z.AnyZodObject,
  TEventType extends SuccessEventType
>(eventType: TEventType, dataSchema: TData) {
  return baseEventSchema.extend({
    eventType: z.literal(eventType),
    data: dataSchema
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function systemEventSchemaGenerator<
  TData extends z.AnyZodObject,
  TEventType extends SystemEventType
>(eventType: TEventType, dataSchema: TData) {
  return baseSystemEventSchema.extend({
    eventType: z.literal(eventType),
    data: dataSchema
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function errorEventSchemaGenerator<
  TData extends z.AnyZodObject,
  TEventType extends ErrorEventType
>(eventType: TEventType, dataSchema: TData) {
  return baseEventSchema.extend({
    eventType: z.literal(eventType),
    data: dataSchema
  });
}
