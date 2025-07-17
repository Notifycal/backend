import type { CreditAdditionResult, CreditDeductionResult } from '@model/Credits';
import {
  type VonageWebhookMessageStatusPayload,
  messagingMessageStatusPayloadSchema
} from '@model/vendor/vonage/schemas';
import type { DateTime, EventId } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import type { ActionableEventFoundEvent } from './ActionableEventFoundEvent';
import { actionableEventReminderAttemptSentEventSchema } from './ActionableEventReminderAttemptSentEvent';
import { eventSchemaGenerator } from './BaseEvent';

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
    ...rebuiltEventObject,
    eventType: 'ActionableEventReminderStatusUpdated',
    eventId: v4() as EventId,
    happenedAt: new Date().toISOString() as DateTime,
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
