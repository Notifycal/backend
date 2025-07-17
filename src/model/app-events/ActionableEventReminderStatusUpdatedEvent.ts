import {
  creditAdjustmentResultSchema,
  type CreditAdditionResult,
  type CreditDeductionResult
} from '@model/Credits';
import {
  messagingMessageStatusPayloadSchema,
  type VonageWebhookMessageStatusPayload
} from '@model/vendor/vonage/schemas';
import type { z } from 'zod';
import type { ActionableEventFoundEvent } from './ActionableEventFoundEvent';
import { actionableEventReminderAttemptSentEventSchema } from './ActionableEventReminderAttemptSentEvent';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

export const actionableEventReminderStatusUpdatedEventSchema = eventSchemaGenerator(
  'ActionableEventReminderStatusUpdated',
  actionableEventReminderAttemptSentEventSchema.shape.data.extend({
    ...messagingMessageStatusPayloadSchema.shape,
    creditAdjustmentResult: creditAdjustmentResultSchema.optional()
  })
);

export type ActionableEventReminderStatusUpdatedEvent = z.infer<
  typeof actionableEventReminderStatusUpdatedEventSchema
>;

export function actionableEventReminderStatusUpdated(
  rebuiltEventObject: Omit<ActionableEventFoundEvent, 'eventType' | 'eventId' | 'happenedAt'>,
  event: VonageWebhookMessageStatusPayload,
  creditDeductionResult: CreditDeductionResult<'deduct'>,
  creditAdjustmentResult?: CreditAdditionResult<'restore'> | CreditDeductionResult<'deduct'>
): ActionableEventReminderStatusUpdatedEvent {
  return {
    ...createEventBase('ActionableEventReminderStatusUpdated', rebuiltEventObject, {
      correlationId: rebuiltEventObject.correlationId
    }),
    data: {
      ...rebuiltEventObject.data,
      messageUUID: event.message_uuid,
      messageStatusPayload: {
        ...event
      },
      creditDeductionResult,
      creditAdjustmentResult
    }
  };
}
