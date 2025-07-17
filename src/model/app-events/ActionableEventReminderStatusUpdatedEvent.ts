import type { CreditAdditionResult, CreditDeductionResult } from '@model/Credits';
import {
  type VonageWebhookMessageStatusPayload,
  messagingMessageStatusPayloadSchema
} from '@model/vendor/vonage/schemas';
import { z } from 'zod';
import type { ActionableEventFoundEvent } from './ActionableEventFoundEvent';
import { actionableEventReminderAttemptSentEventSchema } from './ActionableEventReminderAttemptSentEvent';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

export const actionableEventReminderStatusUpdatedEventSchema = eventSchemaGenerator(
  'ActionableEventReminderStatusUpdated',
  actionableEventReminderAttemptSentEventSchema.shape.data.extend({
    ...messagingMessageStatusPayloadSchema.shape,
    creditAdjustmentResult: z
      .custom<CreditAdditionResult<'restore'> | CreditDeductionResult<'deduct'>>()
      .optional()
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
