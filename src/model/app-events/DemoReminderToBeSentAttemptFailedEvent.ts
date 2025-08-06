import { messagingErrorPayloadSchema } from '@model/vendor/vonage/schemas';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';
import type { DemoReminderToBeSentEvent } from './DemoReminderToBeSentEvent';
import { baseMessagingEventDataSchema } from './messaging-common';

export const demoReminderToBeSentAttemptFailedEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentAttemptFailed',
  baseMessagingEventDataSchema.extend(messagingErrorPayloadSchema.shape)
);

export type DemoReminderToBeSentAttemptFailedEvent = z.infer<
  typeof demoReminderToBeSentAttemptFailedEventSchema
>;

export function demoReminderToBeSentAttemptFailed(
  originalEvent: DemoReminderToBeSentEvent,
  providerErrorPayload: string
): DemoReminderToBeSentAttemptFailedEvent {
  return {
    ...createEventBase('DemoReminderToBeSentAttemptFailed', originalEvent, {
      correlationId: originalEvent.correlationId
    }),
    data: {
      ...originalEvent.data,
      providerErrorPayload
    }
  };
}
