import { messagingErrorPayloadSchema } from '@model/vendor/vonage/schemas';
import type { z } from 'zod';
import type { ActionableEventFoundEvent } from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';
import { baseMessagingEventDataSchema } from './messaging-common';

export const actionableEventReminderAttemptFailedEventSchema = eventSchemaGenerator(
  'ActionableEventReminderAttemptFailed',
  baseMessagingEventDataSchema.extend(messagingErrorPayloadSchema.shape)
);

export type ActionableEventReminderAttemptFailedEvent = z.infer<
  typeof actionableEventReminderAttemptFailedEventSchema
>;

export function actionableEventReminderAttemptFailed(
  originalEvent: ActionableEventFoundEvent,
  providerErrorPayload: string
): ActionableEventReminderAttemptFailedEvent {
  return {
    ...createEventBase('ActionableEventReminderAttemptFailed', originalEvent, {
      correlationId: originalEvent.correlationId
    }),
    data: {
      ...originalEvent.data,
      providerErrorPayload
    }
  };
}
