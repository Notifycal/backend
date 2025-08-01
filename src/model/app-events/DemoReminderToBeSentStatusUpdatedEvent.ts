import type { DemoReminderToBeSentLightenedEvent } from '@lambdas/api/post-event-reminder-delivery-status-webhook/schema';
import {
  demoCounterDecrementResultSchema,
  demoCounterIncrementResultSchema,
  type DemoCounterDecrementResult,
  type DemoCounterIncrementResult
} from '@model/Credits';
import {
  messagingMessageStatusPayloadSchema,
  type VonageWebhookMessageStatusPayload
} from '@model/vendor/vonage/schemas';
import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { demoReminderToBeSentAttemptSentEventSchema } from './DemoReminderToBeSentAttemptSentEvent';
import { createEventBase } from './common';

export const demoReminderToBeSentStatusUpdatedEventSchema = eventSchemaGenerator(
  'DemoReminderToBeSentStatusUpdated',
  demoReminderToBeSentAttemptSentEventSchema.shape.data
    .extend({
      ...messagingMessageStatusPayloadSchema.shape,
      demoCounterIncrementResult: demoCounterIncrementResultSchema,
      demoCounterAdjustmentResult: demoCounterDecrementResultSchema.optional()
    })
    .omit({ message: true })
);

export type DemoReminderToBeSentStatusUpdatedEvent = z.infer<
  typeof demoReminderToBeSentStatusUpdatedEventSchema
>;

export function demoReminderToBeSentReminderStatusUpdated(
  rebuiltEventObject: DemoReminderToBeSentLightenedEvent,
  event: VonageWebhookMessageStatusPayload,
  demoCounterIncrementResult: DemoCounterIncrementResult,
  demoCounterAdjustmentResult?: DemoCounterDecrementResult
): DemoReminderToBeSentStatusUpdatedEvent {
  return {
    ...createEventBase('DemoReminderToBeSentStatusUpdated', rebuiltEventObject, {
      correlationId: rebuiltEventObject.correlationId
    }),
    data: {
      ...rebuiltEventObject.data,
      messageUUID: event.message_uuid,
      messageStatusPayload: {
        ...event
      },
      demoCounterIncrementResult,
      demoCounterAdjustmentResult
    }
  };
}
