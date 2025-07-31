import type { ActionableEventFoundLightenedEvent } from '@lambdas/api/post-event-reminder-delivery-status-webhook/schema';
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
import { actionableEventFoundEventSchema } from './ActionableEventFoundEvent';
import { actionableEventReminderAttemptSentEventSchema } from './ActionableEventReminderAttemptSentEvent';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const actionableEventFoundEventDataSchema = actionableEventFoundEventSchema.shape.data;
export const calendarEventDataLightened =
  actionableEventFoundEventDataSchema.shape.calendarEvent.pick({
    id: true
  });

export const actionableEventReminderStatusUpdatedEventSchema = eventSchemaGenerator(
  'ActionableEventReminderStatusUpdated',
  actionableEventReminderAttemptSentEventSchema.shape.data
    .extend({
      ...messagingMessageStatusPayloadSchema.shape,
      calendarEvent: calendarEventDataLightened,
      creditAdjustmentResult: creditAdjustmentResultSchema.optional()
    })
    .omit({ message: true })
);

export type ActionableEventReminderStatusUpdatedEvent = z.infer<
  typeof actionableEventReminderStatusUpdatedEventSchema
>;

export function actionableEventReminderStatusUpdated(
  rebuiltEventObject: Omit<ActionableEventFoundLightenedEvent, 'eventType'>,
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
