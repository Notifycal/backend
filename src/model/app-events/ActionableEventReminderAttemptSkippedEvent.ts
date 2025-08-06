import type { Uuid } from '@notifycal/shared/types';
import type { z } from 'zod';
import type { ActionableEventFoundEvent } from './ActionableEventFoundEvent';
import { actionableEventReminderAttemptSentEventSchema } from './ActionableEventReminderAttemptSentEvent';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

export const actionableEventReminderAttemptSkippedEventSchema = eventSchemaGenerator(
  'ActionableEventReminderAttemptSkipped',
  actionableEventReminderAttemptSentEventSchema.shape.data.omit({ creditDeductionResult: true })
);

export type ActionableEventReminderAttemptSkippedEvent = z.infer<
  typeof actionableEventReminderAttemptSkippedEventSchema
>;

export function actionableEventReminderAttemptSkipped(
  originalEvent: ActionableEventFoundEvent,
  messageSentUUID: Uuid
): ActionableEventReminderAttemptSkippedEvent {
  return {
    ...createEventBase('ActionableEventReminderAttemptSkipped', originalEvent, {
      correlationId: originalEvent.correlationId
    }),
    data: {
      ...originalEvent.data,
      messageUUID: messageSentUUID
    }
  };
}
