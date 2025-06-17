import { messagingSentPayloadSchema } from '@model/vendor/vonage/schemas';
import type { Uuid } from '@notifycal/shared/types';
import type { z } from 'zod';
import {
  actionableEventFoundEventSchema,
  type ActionableEventFoundEvent
} from './ActionableEventFoundEvent';
import { eventSchemaGenerator } from './BaseEvent';

export const actionableEventReminderAttemptSentEventSchema = eventSchemaGenerator(
  'ActionableEventReminderAttemptSent',
  actionableEventFoundEventSchema.shape.data.extend(messagingSentPayloadSchema.shape)
);

export type ActionableEventReminderAttemptSentEvent = z.infer<
  typeof actionableEventReminderAttemptSentEventSchema
>;

export function actionableEventReminderAttemptSent(
  originalEvent: ActionableEventFoundEvent,
  messageSentUUID: Uuid
): ActionableEventReminderAttemptSentEvent {
  return {
    ...originalEvent,
    eventType: 'ActionableEventReminderAttemptSent' as const,
    data: {
      ...originalEvent.data,
      messageUUID: messageSentUUID
    }
  };
}